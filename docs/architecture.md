# Architecture

> **Skeleton. This file is populated during Phase 1.** Until then, `PLAN.md` §4–§6 describe the intended design (CLAUDE.md).
>
> **Every fact table's `Grain:` sentence lands here,** identical to the comment in its model, and in the same change as the schema. `/model-check` fails any schema change whose grain isn't recorded here.

## Scoring function

## Dimensional model

### Interim research tables (`docs/research/`)

Four CSVs that hold newsletter-target research until the brewer marts exist in `pipeline/dbt/models/marts/`. They are not the mart design. Their rules, source-field mapping and known limitations are in [`docs/research/README.md`](research/README.md). `scripts/research/build_tables.py` derives their surrogate keys and fails if any grain below is violated.

- `dim_brewer.csv` — Grain: one row per brewer (`brewer_natural_key`) per identity version, unique on (`brewer_natural_key`, `effective_from`).
  A rename opens a new version and a relocation does not. Versions track identity (name and website), not ownership, and the table has no ownership columns, so it is not yet the ownership-period `dim_brewer` the marts need.
- `dim_location.csv` — Grain: one row per brewer (`brewer_natural_key`) per site, unique on `location_natural_key`.
  The key is brewer-scoped (`<brewer_natural_key>__<city-slug>`), a stand-in for premises identity until street-address or OSM-id data exists.
- `bridge_brewer_location.csv` — Grain: one row per brewer version (`brewer_sk`) per location (`location_sk`) per continuous occupancy interval, unique on (`brewer_sk`, `location_sk`, `effective_from`).
- `fact_newsletter_target.csv` — Grain: one row per brewer (`brewer_natural_key`) on the newsletter-target list, unique on `brewer_natural_key`.

## Pipeline/serving split

## Technology choices
