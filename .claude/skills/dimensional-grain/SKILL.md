---
name: dimensional-grain
description: Declaring fact table grain, SCD2 patterns, surrogate and natural key conventions, and forbidden column names. Use when creating or altering any dim_, fact_, or bridge_ table, writing a database migration, adding a column, or reviewing a schema change.
allowed-tools: Read, Write, Edit, Grep, Glob
---

# Dimensional grain and key conventions

Governs every table in `pipeline/dbt/models/marts/` and every migration. A schema change that violates anything here is incomplete, not merely imperfect.

## Declaring grain

Every fact table declares its grain in a comment directly above the model definition, and again in `docs/architecture.md`, in a sentence beginning `Grain:`.

```sql
-- Grain: one row per beer per outlet per observation event.
-- A single outlet observed twice on the same day produces two rows.
```

Write the grain as **"one row per ___"**. If the blank needs a conjunction, that conjunction is the grain and every element of it belongs in the unique key.

Before writing any fact model, answer in the comment:

1. What does one row represent?
2. What combination of columns makes a row unique?
3. What happens when the same event arrives twice?

If you cannot answer all three in one sentence each, the grain is not settled. Stop and raise it rather than writing the model.

**Dimensions declare grain too.** `dim_brewer` is not "one row per brewer" — it is one row per brewer per ownership period. Getting this wrong is how SCD2 silently becomes SCD1.

### Grain violations to reject

- A fact table whose unique key is a subset of its stated grain
- A fact table with no unique test in `schema.yml`
- A grain sentence containing "and possibly," "usually," or "typically"
- A grain restated differently in the model comment and `docs/architecture.md`

## Keys

| Suffix | Meaning | Rules |
|---|---|---|
| `_sk` | Surrogate key | Generated with `dbt_utils.generate_surrogate_key`. Never exposed through the API. Never carries meaning. Never reused |
| `_natural_key` | Business key from the source system | Stable, externally meaningful. `gtin`, `ttb_id`, Open Brewery DB id |

Facts reference dimensions by `_sk` only. If a fact needs a natural key for debugging, join to the dimension — do not denormalize it in.

Expose natural keys or opaque public ids through the API. Never surrogate keys: they are internal, they change on a full rebuild, and anything downstream that cached one will silently point at the wrong row.

## SCD Type 2

`dim_brewer` is SCD2. Any dimension where a tracked attribute can change and history matters becomes SCD2 — raise it rather than deciding alone.

Required columns:

```sql
brewer_sk          -- unique per version, not per brewer
brewer_natural_key -- stable across versions
effective_from     -- date, inclusive
effective_to       -- date, exclusive; '9999-12-31' for the current row
is_current         -- boolean, exactly one true per natural key
```

### The join rule

**Facts join to the dimension version valid at the fact's own date, not to the current row.**

```sql
-- Correct
join dim_brewer b
  on  f.brewer_natural_key = b.brewer_natural_key
  and f.observed_date >= b.effective_from
  and f.observed_date <  b.effective_to

-- Wrong — discards the history the dimension exists to preserve
join dim_brewer b
  on  f.brewer_natural_key = b.brewer_natural_key
  and b.is_current
```

Resolve `brewer_sk` at load time against the observation date and store it on the fact. A fact row that points at `is_current` has thrown away the reason SCD2 exists.

### Required tests

- Exactly one `is_current = true` per `brewer_natural_key`
- No overlapping `[effective_from, effective_to)` ranges per natural key
- No gaps between consecutive ranges per natural key
- `effective_from < effective_to` on every row

## Forbidden columns

These names, or any synonym, must not appear on any table. Each is a specific constraint violation, not a style preference.

### Collapsed classification axes

`quality_tier` · `quality_level` · `tier` · `beer_quality` · `craft_level` · `is_craft` · `is_premium`

Brewer independence, production scale, retail price band, and prestige are four separate attributes. A single field has to lie about at least one — Goose Island 312 is a craft-*style* product from a non-independent brewer at a mid price band.

`is_craft` deserves its own mention because it looks innocent. The Brewers Association craft definition is a **conjunction** of two of our axes — small *and* independent. Storing it as one boolean destroys the ability to query them separately. Store `is_independent` and `annual_bbl_estimate` on `dim_brewer` and derive craft status at query time if a caller needs it.

### Asserted availability

`in_stock` · `is_available` · `available` (boolean) · `stock_count` · `quantity_on_hand` · `has_beer`

We do not have inventory data. `fact_availability_score.score` is a probability; `score_band` is its presentation. Nothing else may exist.

### Misplaced price

Price is a property of a store's shelf on a date, not of a beer. `price_cents` belongs on `fact_price_observation` and `fact_availability_observation`. Never on `dim_beer`.

## Naming

- `dim_` / `fact_` / `bridge_` prefixes, snake_case throughout SQL and dbt
- Singular subject in the table name: `dim_beer`, not `dim_beers`
- Booleans read as assertions: `is_current`, `is_independent`
- Dates end `_date`, timestamps end `_at`, and timestamps are UTC
- No abbreviations beyond the glossary in `docs/glossary.md`

## Migration checklist

Run every item before proposing a migration. Report each one explicitly.

1. Grain stated in the model comment and in `docs/architecture.md`, identically
2. Unique test present in `schema.yml` covering the full grain
3. Every `_sk` generated, never natural; every fact reference by `_sk`
4. SCD2 tests present if any dimension is Type 2
5. No forbidden column name introduced — grep the diff for each list above
6. No surrogate key exposed through `packages/types`
7. Timestamps are UTC and named `_at`
8. `docs/architecture.md` updated in the same change, not a follow-up

Item 8 is not optional. Architecture documentation that trails the schema by even one change stops being trusted, and once it stops being trusted nobody updates it again.

See `{baseDir}/reference/scd2-pattern.md` for the full SCD2 implementation including the dbt snapshot configuration.