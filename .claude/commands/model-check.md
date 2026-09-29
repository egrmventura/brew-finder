---
description: Validate a proposed schema change against CLAUDE.md and docs/architecture.md. Run before writing any migration.
argument-hint: [file paths or table names — defaults to the working-tree diff]
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git status:*)
model: opus
---

Validate the proposed schema change: **$ARGUMENTS**. If no argument is given, check every `dim_`, `fact_`, and `bridge_` change in `git diff` and `git status`.

This runs **before** a migration exists. A FAIL means no migration gets written until it's fixed. **Read-only: report, don't fix.**

## Load

1. `CLAUDE.md`: the hard constraints, schema rules, and naming conventions
2. `docs/architecture.md`: the grain definitions and the full schema. While it is a stub, CLAUDE.md makes `PLAN.md` §5 the reference schema. Use §5 for context, and say that you did.
3. The `dimensional-grain` skill: the migration checklist and forbidden-column lists
4. The ADRs the change touches in `docs/adr/`

## Checks

Report every item individually, with PASS, FAIL, or N/A and its evidence: a command's output, or a file and line. **Never summarize.** "All checks passed" is indistinguishable from an unrun check. N/A needs the same justification as a PASS.

1. **Four-axis rule** (constraint 1). There is no `quality_tier`, `quality_level`, `tier`, `beer_quality`, `craft_level`, `is_craft`, or `is_premium`, and no synonym for any of them. There is no price column on `dim_beer`.
2. **Scored availability** (constraint 2). There is no `in_stock`, `is_available`, boolean `available`, `stock_count`, `quantity_on_hand`, or `has_beer`, and no synonym for any of them. The NJ distribution-footprint flag is nullable and three-valued, and its name doesn't read as a stock boolean (ADR-0003).
3. **SCD2** (constraint 3). A change to `dim_brewer`, or to any Type 2 dimension, keeps `effective_from`, `effective_to`, and `is_current`, plus the four required tests. No fact joins on `is_current`. Facts resolve the surrogate key valid at the observation date.
4. **No BJCP** (constraint 5, ADR-0002). There is no `bjcp_*` column or crosswalk, and no BJCP-derived vital statistics.
5. **Grain declared.** Every fact or dimension that is new or changed has a `Grain:` comment written as "one row per ___". The **identical** sentence is in `docs/architecture.md`, in the same change.
   - If `docs/architecture.md` is still a stub, this check FAILS. Updating it is part of the change, not a follow-up.
6. **Grain enforced.** A unique test in `schema.yml` covers the full grain. Facts use `dbt_utils.unique_combination_of_columns`.
7. **Keys.** `_sk` columns are generated, never natural. Facts reference dimensions by `_sk` only. No `_sk` appears in `packages/types`.
8. **Naming.** `dim_`/`fact_`/`bridge_` prefixes, singular table names, and snake_case. `_sk` marks surrogate keys and `_natural_key` marks natural keys. Booleans start with `is_`. Timestamps end in `_at` and are UTC; dates end in `_date`.
9. **Controlled vocabularies.** Every enum-like column has an `accepted_values` test. Its values match the ADRs: `fact_availability_observation.source_type` is `manual | newsletter | osm | licensee` (ADR-0001, 0004, 0005). `dim_outlet` holds NJ premises only (ADR-0003).
10. **Type-1 flattening.** No change overwrites history that an SCD2 dimension or a dated fact is meant to keep.

## Verdict

End with a count of passed, failed, and not-applicable items. Then list every failure with its file, line, and the constraint it violates. Finish with exactly one of:

- **Migration may be written.** Zero FAILs.
- **Do not write the migration.** One or more FAILs.
