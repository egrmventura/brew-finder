---
name: geo-query-patterns
description: PostGIS spatial queries, SRID and geography column discipline, GiST indexing, radius search, outlet opening-hours and timezone handling, and dry-municipality exclusion. Use when writing or reviewing any location query, distance calculation, "open now" filter, or spatial index.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Geo query patterns

Two stated success metrics depend entirely on this skill: p95 query latency under 2 seconds, and "open now" accuracy at or above 95%. Both fail quietly. A missing index is fast on 500 rows and unusable on 50,000; a timezone bug is invisible until the week the clocks change.

## Geography, not geometry

Store locations as `geography(Point, 4326)`.

```sql
alter table dim_outlet
  add column geog geography(Point, 4326)
  generated always as (st_point(lng, lat)::geography) stored;
```

`geography` computes on a spheroid and returns **meters**. `geometry` with SRID 4326 returns **degrees**, which are not a distance and vary with latitude. A radius search written against `geometry` will silently return the wrong set.

Keep `lat` and `lng` as plain columns for serialization; `geog` is generated from them so the two cannot drift.

**All distances in this codebase are meters.** Convert at the API boundary if a caller sends miles. Never store or pass a mixed unit.

## The index

Every geography column has a GiST index. No exceptions.

```sql
create index dim_outlet_geog_idx on dim_outlet using gist (geog);
```

Without it, every radius query is a sequential scan over every outlet. This is the single most likely cause of missing the latency target.

## Radius search

```sql
-- Correct
select outlet_sk, name,
       st_distance(geog, :origin) as distance_m
from dim_outlet
where st_dwithin(geog, :origin, :radius_m)
order by geog <-> :origin
limit 50;
```

Three rules, each of which is a real bug if broken:

**Use `ST_DWithin` in `WHERE`, never `ST_Distance < x`.** `ST_DWithin` uses the GiST index. A comparison on `ST_Distance` cannot — it computes distance for every row first, then filters. Same results, sequential scan.

**`ST_Distance` in the select list is fine.** It runs only on rows that already passed the filter.

**Order by the `<->` KNN operator, not by the computed distance column.** `<->` is index-assisted; ordering by the alias is not.

### Verify, don't assume

Run `EXPLAIN (ANALYZE, BUFFERS)` on every new spatial query and confirm an `Index Scan` on the GiST index, not a `Seq Scan`. Report the plan. A query that looks correct and scans sequentially passes tests and fails the latency metric.

## Opening hours

### Store local, never UTC

Opening hours are wall-clock facts in the outlet's own timezone. Store them as local time plus an IANA timezone column on `dim_outlet`:

```sql
timezone text not null default 'America/New_York'  -- IANA identifier
```

**Never convert hours to UTC for storage.** A store that opens at 9am opens at 9am in July and in January. Stored as UTC it shifts by an hour twice a year and is wrong for roughly half of every year.

New Jersey is entirely `America/New_York`, so this looks like ceremony today. The column exists because market two will not be, and retrofitting a timezone into hours logic after the fact means re-auditing every stored row.

### Open now

```sql
with local_now as (
  select (now() at time zone o.timezone) as ts, o.outlet_sk
  from dim_outlet o where o.outlet_sk = :outlet_sk
)
...
```

Resolution order, and it matters:

1. **Check `dim_outlet_hours_exception` first** — holidays and one-off closures override the weekly pattern. A store closed Christmas Day has a normal Thursday row
2. Then the day-of-week row in `dim_outlet_hours`
3. Handle past-midnight closing (`close_time < open_time` means the interval crosses into the next day)
4. No hours row for that day means **closed**, not unknown-so-include

**Never compute "open now" in application code from a UTC timestamp and an offset.** Offsets are not timezones — they don't know about DST transitions.

### Unknown hours

An outlet with no hours data is not open. Surface it as `Hours unknown — call ahead` and rank it below outlets with known hours. Never include it in an "open now" filter result.

Sending someone to a closed store is the most infuriating failure this product can produce, and the success metric treats it that way.

## Dry municipality exclusion

Roughly 30 New Jersey municipalities prohibit retail alcohol sale. They are modeled as a **geographic exclusion table**, not as a flag on outlets:

```sql
-- Grain: one row per municipality that prohibits retail alcohol sale.
dry_municipality (municipality_id, state_code, name, boundary geography(Polygon,4326), source, last_verified)
```

Applied as a filter at query time. Do not bake the exclusion into `dim_outlet` — a municipality's status can change, and an exclusion table is one row to update rather than a re-derivation of every outlet.

Index `boundary` with GiST and use `ST_Intersects`.

A radius search that returns confident results in a town with no legal outlets is a correctness failure, not a cosmetic one.

## Never

- `ST_Distance` in a `WHERE` clause
- A geography column without a GiST index
- Mixed units — miles anywhere past the API boundary
- Distance computed in TypeScript
- Hours stored in UTC
- A fixed UTC offset in place of an IANA timezone
- Treating missing hours as open
- Shipping a spatial query without reading its `EXPLAIN` output