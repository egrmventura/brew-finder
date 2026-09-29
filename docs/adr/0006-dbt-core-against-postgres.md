# ADR-0006 — dbt-core runs directly against Postgres, not DuckDB

**Status:** Accepted
**Date:** 2026-09-23

## Context

`PLAN.md` §6 and the CLAUDE.md stack specify "dbt over DuckDB locally, materializing to Postgres". No ADR records that choice, and nothing has been built on it: `pipeline/dbt/` is empty. The `dbt` found on this machine's PATH is the dbt Cloud CLI (observed 2026-09-23), not dbt-core with any adapter.

The serving layer is Postgres 18 with PostGIS and `pg_trgm` (§6). The marts the app queries depend on Postgres features:

- `geography` columns with GiST indexes for radius search
- trigram indexes on `dim_beer_alias.normalized_text` for fuzzy matching

Building marts in DuckDB means those types and indexes are created at a second step, when data crosses from DuckDB into Postgres. That crossing sits outside a single dbt target's `ref()` graph, so dbt tests run against the DuckDB copy rather than the tables users actually hit.

The project ships for self-hosting, and it has a clone-to-running target of under 30 minutes (ADR-0001, `PLAN.md` §0.3). Every engine in the pipeline is one more thing a self-hoster installs and one more boundary that can drift.

## Decision

The pipeline uses **dbt-core with the Postgres adapter, targeting the local Postgres instance directly.**

- Raw ingest, staging, intermediate, and marts all live in that Postgres, in separate schemas. The marts dbt builds are the tables the app serves.
- DuckDB is not part of the pipeline.
- The dbt Cloud CLI is not used: it requires a dbt Cloud account, which a self-hoster would need in addition to the repo (ADR-0001).
- Versions of dbt-core and the adapter are pinned when the pipeline is first installed, and recorded then. None is chosen here.

## Consequences

### What this enables

- **One engine, one boundary.** The geography columns, GiST indexes, and trigram indexes are created by dbt models and checked by `dbt test` where they are used.
- **One fewer runtime for self-hosters.** They run Postgres, which serving already requires, and nothing else.
- **`/model-check` and the `dimensional-grain` checklist examine the same tables that serve queries,** not an upstream copy of them.

### What this costs

- **No local-analytics path without a Postgres connection.** Every dbt run, test, or ad-hoc exploration of pipeline data needs a reachable Postgres with PostGIS. Working on a laptop without the database running means no pipeline at all. With DuckDB you'd point at a file.
- **Analytical transforms run on a row store.** Large scans, such as parsing and deduplicating COLA label history nationally, run in Postgres rather than a columnar engine. They will be slower, and they share the instance with serving queries unless run off-hours.
- **CI needs a Postgres service with PostGIS** to run `dbt build` and `dbt test`, not just a file on disk.
- **The dbt Cloud CLI on PATH shadows dbt-core.** `pnpm dbt:run` and `pnpm dbt:test` call whichever `dbt` comes first on PATH. Setup documentation must install dbt-core explicitly and check which `dbt` resolves.

## Alternatives considered

### DuckDB locally, materializing to Postgres (`PLAN.md` §6 as written)

Two engines and a transfer step. PostGIS types and indexes, and `pg_trgm` indexes, would be created on the Postgres side of the copy, outside what dbt tests. Self-hosters would install and run both engines to get the tables the app needs.

### DuckDB for all pipeline work, with a separate loader into Postgres for serving

The same transfer problem, plus a loader outside dbt that has to be written, tested, and kept in sync with every mart's schema. The mart definitions and the served tables could then drift apart.

### dbt Cloud CLI (what is installed today)

It requires a dbt Cloud account and a connection to dbt Cloud. That is an agreement every self-hoster would need, which ADR-0001 rules out.
