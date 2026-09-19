# BeerFinder

**Find where you can probably buy the beer you want, near you, right now.**

Search by beer or by style, get nearby stores and taprooms ranked by how likely they are to have it, filtered to what's open. Built on the premise that retail beer inventory isn't published anywhere — so availability is a scored prediction over real signals, never an inventory claim.

> **Status: pre-alpha.** Phase 0 — foundational documents and repository structure. No application code yet. See [`PLAN.md` §7](./PLAN.md) for the phase roadmap.

---

## The idea in three lines

- **Nobody publishes beer inventory.** The APIs that tried are dead — BreweryDB, Punk API, and Drizly all shut down. Untappd's API has been closed to new applications since early 2024.
- **So we predict instead of look up.** State-level distribution footprint, store archetype, seasonality, observation recency, and brewery proximity combine into a confidence score.
- **And we never overclaim.** Results show confidence bands and an observation date. There is no boolean "in stock" anywhere in this codebase, by design.

## Documentation map

Four documents, four audiences. They are deliberately not merged.

| File | Audience | Purpose |
|---|---|---|
| **README.md** (this file) | Anyone arriving at the repo | What this is, how to run it, where to go next |
| **[CLAUDE.md](./CLAUDE.md)** | Claude Code, every session | Hard operating constraints. Short by design — it's read every time |
| **[PLAN.md](./PLAN.md)** | Humans and agents, by section | Design source of record: mission, research, schema, phases |
| **[docs/](./docs/)** | Whoever's working in that area | Architecture, data sources, ADRs, model policy, handoffs |

Inside `docs/`:

| File | Contents |
|---|---|
| [`architecture.md`](./docs/architecture.md) | Dimensional model, scoring function, pipeline/serving split |
| [`data-sources.md`](./docs/data-sources.md) | Source register with tiers, licenses, and verification dates |
| [`taxonomy-decisions.md`](./docs/taxonomy-decisions.md) | Index of classification ADRs |
| [`models.md`](./docs/models.md) | Which Claude model runs which work, and the Opus 5 ceiling |
| [`glossary.md`](./docs/glossary.md) | Domain terms — bbl, COLA, GTIN, three-tier, SCD2, grain |
| [`adr/`](./docs/adr/) | Architecture decision records |
| [`handoffs/`](./docs/handoffs/) | Dated session notes — the actual current state |

**Start here:** `PLAN.md` §0.1–0.4 for the mission and scope boundaries, then `CLAUDE.md` before writing anything.

## Quick start

### Prerequisites

- Node.js 22.13+
- pnpm 12+
- PostgreSQL 18 with the PostGIS and `pg_trgm` extensions
- A Google Places API key (Phase 1 onward)

### Setup

```bash
pnpm install
cp .env.example .env          # then fill in DATABASE_URL and GOOGLE_PLACES_API_KEY
pnpm db:migrate
pnpm db:seed                  # loads the style taxonomy and Open Brewery DB extract
pnpm dev
```

### Common commands

```bash
pnpm dev            # web app, local
pnpm test           # all packages
pnpm typecheck
pnpm lint
pnpm dbt:run        # build the enrichment pipeline
pnpm dbt:test       # includes source freshness checks
```

## Repository layout

```
apps/
  web/              Next.js 16 — map, search, filters
  mobile/           Expo / React Native
packages/
  types/            Shared TypeScript types; the frontend-facing contract
  api-client/       Typed client consumed by both apps
  scoring/          The availability model — highest-scrutiny code in the repo
pipeline/
  dbt/              Staging → intermediate → marts
  ingest/           Source fetchers, one module per registered source
  tests/            Pipeline tests and scoring fixtures
docs/               See documentation map above
.claude/
  agents/           Subagent definitions, each pinned to a model
  commands/         /plan-phase, /new-source, /model-check, /scoring-eval, /handoff
```

## Conventions

Full detail in [`CLAUDE.md`](./CLAUDE.md). The load-bearing ones:

- **Four orthogonal classification axes.** Brewer independence, production scale, retail price band, and prestige are separate attributes. Never a single `quality_tier`. Goose Island 312 is the counterexample that proves it — craft-style product, non-independent brewer.
- **Availability is scored, never asserted.** No function, column, endpoint, or UI element returns a boolean stock value.
- **`dim_brewer` is SCD Type 2.** Ownership changes are the reason the independence axis means anything.
- **No source without a register entry.** Nothing may fetch from a source that lacks an entry in `docs/data-sources.md` with a verification date.
- **Every fact table states its grain explicitly.** In a sentence beginning "Grain:".
- Naming: `_sk` surrogate keys, `_natural_key` natural keys, `dim_` / `fact_` / `bridge_` table prefixes.

## Working with Claude Code

Model routing is governed by [`docs/models.md`](./docs/models.md) and enforced in `.claude/settings.json`. The ceiling is **Opus 5**; the `fable` and `best` aliases are prohibited. Session default is `opusplan` — Opus while planning, Sonnet while executing.

Start a session by reading `CLAUDE.md` and the most recent note in `docs/handoffs/`. End it with `/handoff`.

## Data and licensing

Brewery and outlet data comes from [Open Brewery DB](https://www.openbrewerydb.org/) (MIT), the [TTB Public COLA Registry](https://www.ttb.gov/regulated-commodities/labeling/cola-public-registry) (US federal, unrestricted), Google Places, and OpenStreetMap (ODbL).

**BJCP style guidelines are copyrighted and not licensed for commercial use without written permission.** They are used here as a detachable overlay only; the license-safe base taxonomy is TTB class and type designations under 27 CFR Part 7. See [ADR-0002](./docs/adr/).

## Legal

BeerFinder is an information service. It does not sell, deliver, broker, or facilitate the purchase of alcohol, and it is not a participant in any tier of the three-tier system. Age verification is required for access.

Availability is estimated and may be wrong. Nothing here is legal advice.

---

*Not affiliated with any brewery, retailer, or distributor. Drink responsibly.*