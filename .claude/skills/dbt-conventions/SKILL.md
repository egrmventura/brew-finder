---
name: dbt-conventions
description: dbt model layering, naming, materialization, ref discipline, and required tests. Use when creating or editing any dbt model, adding a source, writing schema.yml, configuring freshness, or reviewing the pipeline DAG.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# dbt conventions

Three layers, one direction. Layering violations compound silently — by model forty, an undisciplined DAG is the problem rather than any individual model.

## Layers

| Layer | Path | Purpose | Materialization | Naming |
|---|---|---|---|---|
| **staging** | `models/staging/<source>/` | One model per source table. Rename, cast, deduplicate. Nothing else | `view` | `stg_<source>__<entity>` |
| **intermediate** | `models/intermediate/` | Joins, reshaping, business logic. Never exposed | `ephemeral` or `view` | `int_<verb_phrase>` |
| **marts** | `models/marts/` | The dimensional model | `table` or `incremental` | `dim_` · `fact_` · `bridge_` |

Double underscore in staging names separates source from entity: `stg_obdb__breweries`, `stg_ttb__cola_labels`.

### Staging rules

A staging model does exactly four things: select from one source, rename columns to our conventions, cast types, and deduplicate if the source requires it.

It must not: join to anything, aggregate, filter business rows, apply logic, or reference another model. **Staging references `source()` only.**

The test: if the upstream provider changes a column name, exactly one staging model changes and nothing else does. That isolation is the entire reason the layer exists.

### Intermediate rules

Where joins and logic live. Named for what it does — `int_breweries_joined_to_outlets`, `int_beer_aliases_normalized` — not for what it contains.

Never referenced outside the pipeline. If something outside `pipeline/` needs it, it belongs in marts.

### Marts rules

The dimensional model. Grain, keys, and SCD2 are governed by the `dimensional-grain` skill — load it before writing any mart. This skill covers only how marts sit in the DAG.

## Dependency direction

```
source() → staging → intermediate → marts
```

One direction, no exceptions:

- Staging references `source()` only
- Intermediate references staging and intermediate
- Marts reference staging, intermediate, and marts

A mart may reference staging directly when no transformation is needed. Creating a pass-through intermediate model to satisfy a layering aesthetic adds a node and no value.

**Never:** staging referencing a model, intermediate referencing a mart, or any circular path.

## ref and source

Every model reference uses `{{ ref('model_name') }}`. Every source reference uses `{{ source('source_name', 'table_name') }}`.

**Never hardcode a schema-qualified table name in a model.** It breaks the DAG, so dbt cannot order the build, and the dependency becomes invisible to `dbt test` and to anyone reading lineage.

## Sources

Declared in `models/staging/<source>/_<source>__sources.yml`. Every source requires a freshness block:

```yaml
sources:
  - name: obdb
    database: raw
    schema: open_brewery_db
    loaded_at_field: _ingested_at
    freshness:
      warn_after: {count: 7, period: day}
      error_after: {count: 30, period: day}
    tables:
      - name: breweries
```

Set thresholds from the source's actual update cadence, not a default. A source that publishes monthly should not error after seven days.

**Every source in `sources.yml` must already be registered in `docs/data-sources.md`.** Load the `source-registration` skill if it is not.

## Required tests

Every model has, in `schema.yml`:

- `not_null` and `unique` on the primary key
- `relationships` on every foreign key
- `accepted_values` on every column with a controlled vocabulary — `brewery_type`, `outlet_type`, `attribute_group`, `attribute_code`, `score_band`

Every **mart fact** additionally has a `dbt_utils.unique_combination_of_columns` test covering the full stated grain. A fact table whose unique test covers less than its grain is untested for the thing most likely to go wrong.

Every **SCD2 dimension** additionally has the four tests listed in `dimensional-grain`.

A model with no tests does not merge.

## Materialization

Default `view` for staging, `ephemeral` for intermediate, `table` for marts.

Move a fact to `incremental` only when a full rebuild becomes slow enough to matter. When you do, state the `unique_key` and the incremental predicate explicitly, and confirm a full refresh still produces identical output. An incremental model that drifts from its full-refresh result is worse than a slow one.

## Before proposing a model

1. Correct layer for what it does
2. Name follows the layer's pattern
3. Dependencies point one direction
4. All references through `ref()` or `source()`
5. Tests present per the requirements above
6. For marts, the `dimensional-grain` checklist run and reported item by item
7. `dbt parse` succeeds, and `dbt build --select <model>+` runs clean

Report which of these you actually executed. If dbt was unavailable, say so — do not describe a model as validated because it was written correctly.