# CLAUDE.md

Operating constraints for this repository. Read this at the start of every session before touching code.

## Hard constraints

Violating any of these is wrong by construction, not a style nit. Reject them in review, including your own.

1. **Four-axis classification rule.** Brewer independence, production scale, retail price band, and prestige/scarcity are four separate attributes — never collapse them into a single `quality_tier` (or `quality_level`, `tier`, etc.) field. Goose Island 312 is the counterexample: a craft-*style* product from a brewer that fails the independence test (AB InBev owns it), at a mid price band with national distribution — one enum can't represent that without lying about at least one axis. Price band is a property of a store's shelf, not of a beer: it belongs on `fact_price_observation`, never on `dim_beer`.

2. **Availability is scored, never asserted.** No function, endpoint, database column, or UI element may return or display a boolean "in stock" or a stock count. Return a confidence band (`Very likely` / `Usually stocked` / `Sometimes` / `Call ahead`) plus the last observation date instead. We have no inventory feed — anything shaped like a stock boolean is fabricating certainty we don't have. If you are writing `isInStock`, `inStock`, `available: boolean`, or `stock_count`, stop.

3. **`dim_brewer` is SCD Type 2.** Every row carries `effective_from`, `effective_to`, `is_current`; joins from facts use the surrogate key valid at the observation date, not the current row. Ownership history is load-bearing — it's the fact that makes the independence axis meaningful, not bookkeeping to discard.

4. **Source tiering is enforced before code, not after.** Tier 1 sources may be depended on freely. Tier 2/3 sources require an entry in `docs/data-sources.md` with a `last_verified` date *before* any fetcher or scraper calls them, because an undocumented source is an unvetted legal and reliability liability. Tier 4 is dead — BreweryDB, Punk API, Drizly, openbeerdb — named here so nobody rediscovers them.

5. **BJCP content is license-restricted.** Non-commercial use only, absent written permission we don't currently have. BJCP codes live in a nullable, swappable crosswalk column on `dim_style` — never as a primary key, never as a required join — so the taxonomy still works if permission is denied.

6. **No commerce.** No cart, checkout, delivery, or reservation, in any surface. Remaining an information service is what keeps us outside three-tier licensing entirely; facilitating a transaction inherits those obligations in every state we operate in. Full non-goal list: `PLAN.md` §0.4.

7. **Never invent values.** Never fabricate version numbers, URLs, dates, or identifiers. If a value is needed and not available, stop and ask. A placeholder written into a file is indistinguishable from a verified one the moment the session ends.

## Schema rules

Every fact table declares its grain — in a comment and in `docs/architecture.md`, in a sentence beginning `Grain:`. A schema change that leaves the grain unstated or ambiguous is incomplete.

Validate any schema change against the constraints above before writing the migration; grain violations and accidental Type-1 flattening are expensive to reverse once data has landed. `/model-check` is the intended vehicle and is not built yet — until it exists, do the check by hand.

## Testing

Work in `packages/scoring` and on identity resolution does not begin until the `entity-resolution` and `scoring-eval-protocol` skills exist. If asked to start either, name the missing skill and stop.

Tests come before implementation in `packages/scoring` and in any identity-resolution code. These are the two places where generated code looks correct and is subtly wrong — a fuzzy matcher that silently collapses two distinct beers, or a weighting that emits confident scores from near-zero evidence. Write fixtures with known-correct expected values first, every time. Elsewhere, normal review suffices.

## Review

Review runs in two passes and neither substitutes for the other: `/code-review` for correctness, then `constraint-audit` for project constraints. A diff can be entirely bug-free and still flatten `dim_brewer` to Type 1; it can be constraint-clean and still have an off-by-one. Run both, report them separately. A change is not ready to merge until both have run.

Report checklist items individually with their evidence. "All checks passed" is indistinguishable from an unrun check.

## Naming conventions

- `_sk` — surrogate key. `_natural_key` — business/natural key.
- Table prefixes: `dim_`, `fact_`, `bridge_`.
- snake_case in SQL/dbt, camelCase in TypeScript — `packages/types` is the translation boundary between them.

## Stack

- Node 22.13+, pnpm 12+, TypeScript strict
- Next.js 16 App Router (`apps/web`), Expo / React Native (`apps/mobile`)
- PostgreSQL 18 + PostGIS + `pg_trgm` (serving layer)
- dbt over DuckDB locally, materializing to Postgres (enrichment pipeline)
- MapLibre GL for maps (not Mapbox — avoids per-load billing surprises)
- GitHub Actions on cron for orchestration

## Commands

```
pnpm test        pnpm typecheck    pnpm lint
pnpm dev         pnpm db:migrate   pnpm db:seed
pnpm dbt:run     pnpm dbt:test
```

Run `pnpm typecheck && pnpm lint && pnpm test` before declaring any work complete.

## Model policy

Ceiling is Opus 5. The `fable` and `best` aliases are prohibited — `best` resolves to a Fable model where available, silently exceeding the ceiling. No agent, command, or skill may name a model above `opus`.

## More detail

- Model routing and subagent pinning: `docs/models.md`
- Full schema, grain definitions, and the scoring function: `docs/architecture.md`

Both are stubs as of Phase 0. Until they're written, `PLAN.md` §5 (dimensional model) and §9 (workflow) are the source.

`PLAN.md` describes intent, not progress. Current state of the work is in `docs/handoffs/` — read the most recent note at the start of every session. When `PLAN.md` and this file disagree on behavior, this file wins and `PLAN.md` gets corrected. When either disagrees with an ADR, the ADR wins — ADRs are dated and represent later thinking.