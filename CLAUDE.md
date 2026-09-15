# CLAUDE.md

Operating constraints for this repository. Read at the start of every session. Kept short so it actually gets read — the long-form reasoning lives in `PLAN.md` and `docs/adr/`.

**BeerFinder** tells a user where, near them, they can probably buy a specific kind of beer right now. It is an information service. It does not sell, deliver, or broker alcohol.

---

## Hard constraints

These five are not preferences. Code that violates them is wrong and should be rejected in review, including your own.

### 1. Four orthogonal classification axes

Brewer independence, production scale, retail price band, and prestige are **four separate attributes**. Never collapse them into a single `quality_tier`, `quality_level`, `tier`, or equivalent field.

Goose Island 312 is the counterexample that settles it: a craft-*style* product from a non-independent brewer (AB InBev ownership fails the Brewers Association independence pillar) at a mid price band with national distribution. Any single enum has to lie about at least one of those.

Price band is a property of a **store's shelf**, not of a beer. It belongs on `fact_price_observation`, never on `dim_beer`.

Full reasoning: ADR-0001.

### 2. Availability is scored, never asserted

No function, endpoint, database column, API field, or UI element may return or display a boolean "in stock," a stock count, or anything a user could reasonably read as a live inventory claim.

We do not have inventory data. Nobody publishes it. What we have is a confidence score over signals — distribution footprint, outlet archetype, seasonality, observation recency, brewery proximity.

Surface it as a band (`Very likely` / `Usually stocked` / `Sometimes` / `Call ahead`) with the last observation date. Never as a number, never as a boolean.

If you find yourself writing `isInStock`, `inStock`, `available: boolean`, or `stock_count`, stop. Full reasoning: ADR-0005.

### 3. `dim_brewer` is SCD Type 2

Ownership history is load-bearing, not bookkeeping. `is_independent` is time-varying — it is precisely the fact that makes the independence axis meaningful. A Type 1 dimension discards the before/after that the classification depends on.

Every `dim_brewer` row carries `effective_from`, `effective_to`, `is_current`. Joins from facts use the surrogate key valid at the observation date, not the current row.

### 4. No source without a register entry

Nothing may fetch, scrape, or call an external data source unless that source already has an entry in `docs/data-sources.md` with a tier and a `last_verified` date.

- **Tier 1** — depend on freely.
- **Tier 2 / Tier 3** — require an entry *and*, for Tier 3, a recorded decision in `docs/adr/`.
- **Tier 4 (dead)** — BreweryDB, Punk API, Drizly, openbeerdb. Do not attempt. They are listed so nobody rediscovers them.

Use `/new-source` to scaffold ingest modules; it creates the register entry as part of the scaffold. Do not hand-roll a fetcher around it.

### 5. BJCP content is license-restricted

BJCP style guidelines are copyrighted and **not licensed for commercial use** without written permission, which we do not currently have.

The license-safe base taxonomy is **TTB class and type designations** (27 CFR Part 7) — US federal, unrestricted. BJCP codes live in a nullable crosswalk column on `dim_style`, never as a primary key, never as a required join. The taxonomy must survive deleting every BJCP value.

Full reasoning: ADR-0002.

---

## Scope

`PLAN.md` §0.4 lists the non-goals. The ones most likely to be proposed in good faith and most damaging to accept:

- **No commerce.** No cart, checkout, delivery, or reservation. Staying an information service keeps us outside three-tier licensing entirely. This is the most consequential boundary in the project.
- **No ratings or social feed.** User confirmations train the model; they are not content.
- **No real-time inventory claims.** See constraint 2.

If a requested feature falls in a non-goal, say so and cite §0.4 rather than building it.

---

## Conventions

**Naming**
- `_sk` — surrogate key. `_natural_key` — business/natural key.
- Table prefixes: `dim_`, `fact_`, `bridge_`.
- Snake case in SQL and dbt; camel case in TypeScript; `packages/types` is the boundary.

**Grain**
- Every fact table declares its grain in a comment and in `docs/architecture.md`, in a sentence beginning `Grain:`.
- A schema change that leaves a grain unstated or ambiguous is incomplete. Run `/model-check` before writing any migration.

**Workstream boundaries** — subagents own disjoint scopes; respect them in the main session too.

| Scope | Owns | Never touches |
|---|---|---|
| Pipeline | `pipeline/` | app code |
| API | route handlers, `packages/api-client` | dbt models |
| Frontend | `apps/web`, `apps/mobile` | queries |

The contract between them is `packages/types` plus the dbt marts schema. Changing either is a cross-boundary change — plan it before implementing.

**Tests before implementation** in `packages/scoring` and any identity-resolution code. These are the two places where generated code looks correct and is subtly wrong — a fuzzy matcher that silently collapses two distinct beers, or a weighting that emits confident scores from near-zero evidence. Write fixtures with known-correct expected values first, every time. Elsewhere, normal review suffices.

---

## Stack

- Node 20+, pnpm 9+, TypeScript strict
- Next.js 15 App Router (`apps/web`), Expo / React Native (`apps/mobile`)
- PostgreSQL 16 + PostGIS + `pg_trgm` — serving layer
- dbt over DuckDB locally, materializing to Postgres — enrichment pipeline
- MapLibre GL for maps (not Mapbox — per-load billing)
- GitHub Actions on cron for orchestration

**Commands**

```bash
pnpm test        pnpm typecheck    pnpm lint
pnpm dev         pnpm db:migrate   pnpm db:seed
pnpm dbt:run     pnpm dbt:test
```

Run `pnpm typecheck && pnpm lint && pnpm test` before declaring work complete.

---

## Model policy

Ceiling is **Opus 5**. The `fable` and `best` aliases are prohibited — `best` resolves to a Fable model where available and silently exceeds the ceiling. No agent, command, or skill may name a model above `opus`.

Routing table and subagent pinning: `docs/models.md`. Enforced in `.claude/settings.json` via `availableModels`. Session default is `opusplan`.

---

## Session protocol

1. Read this file and the most recent note in `docs/handoffs/`.
2. For phase work, run `/plan-phase <n>` and review the plan before any code is written.
3. Run `/model-check` before any migration.
4. Run `/handoff` at session end.

Do not begin implementation from an unreviewed plan. Plan-first is the working method here, not a formality.

---

## Where things live

| Need | File |
|---|---|
| Mission, scope, non-goals | `PLAN.md` §0 |
| Why classification works this way | `PLAN.md` §1–2, `docs/adr/` |
| Data sources and their status | `docs/data-sources.md` |
| Schema, grain, scoring function | `docs/architecture.md` |
| Phase roadmap | `PLAN.md` §7 |
| Legal boundaries | `PLAN.md` §8 |
| Model routing | `docs/models.md` |
| Current state of the work | `docs/handoffs/` — *not* `PLAN.md` |

`PLAN.md` describes intent, not progress. When it disagrees with this file on behavior, this file wins and `PLAN.md` gets corrected. When either disagrees with an ADR, the ADR wins — ADRs are dated and represent later thinking.