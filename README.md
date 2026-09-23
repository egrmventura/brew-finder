# BeerFinder

**Find where in New Jersey you can probably buy the beer you want, near you, right now.**

Search by beer or by style, get nearby stores and taprooms ranked by how likely they are to have it, filtered to what's open. Built on the premise that retail beer inventory isn't published anywhere — so availability is a scored prediction over real signals, never an inventory claim.

**Scope:**

- **Stores are in New Jersey only.** Beers and brewers come from anywhere in the US ([ADR-0003](./docs/adr/0003-nj-retail-national-beer-scope.md)).
- **Non-commercial and open source.** The code is MIT-licensed and built for anyone to self-host ([ADR-0001](./docs/adr/0001-non-commercial-free-sources-only.md)).

> **Status: pre-alpha.** Phase 0: foundational documents, repository structure, and the scope decisions in [ADR-0001 to ADR-0005](./docs/adr/). No application code yet. See [`PLAN.md` §7](./PLAN.md) for the phase roadmap.

---

## The idea in three lines

- **Nobody publishes beer inventory.** The APIs that tried are dead — BreweryDB, Punk API, and Drizly all shut down. Untappd's API has been closed to new applications since early 2024.
- **So we predict instead of look up.** A confidence score combines five signals:
  - whether the beer is distributed in New Jersey at all ([ADR-0003](./docs/adr/0003-nj-retail-national-beer-scope.md))
  - store archetype
  - seasonality
  - how recent the observations are, from manual shelf checks and brewery newsletters ([ADR-0001](./docs/adr/0001-non-commercial-free-sources-only.md), [ADR-0005](./docs/adr/0005-release-data-public-dataset-repo.md))
  - brewery proximity
- **And we never overclaim.** Results show confidence bands and an observation date. There is no boolean "in stock" anywhere in this codebase, by design.

## Documentation map

Four documents, four audiences. They are deliberately not merged.

| File | Audience | Purpose |
| --- | --- | --- |
| **README.md** (this file) | Anyone arriving at the repo | What this is, how to run it, where to go next |
| **[CLAUDE.md](./CLAUDE.md)** | Claude Code, every session | Hard operating constraints. Short by design — it's read every time |
| **[PLAN.md](./PLAN.md)** | Humans and agents, by section | Design source of record: mission, research, schema, phases |
| **[docs/](./docs/)** | Whoever's working in that area | Architecture, data sources, ADRs, model policy, handoffs |

Inside `docs/`:

| File | Contents |
| --- | --- |
| [`architecture.md`](./docs/architecture.md) | Dimensional model, scoring function, pipeline/serving split |
| [`data-sources.md`](./docs/data-sources.md) | Source register with tiers, licenses, and verification dates |
| [`taxonomy-decisions.md`](./docs/taxonomy-decisions.md) | Index of classification ADRs |
| [`models.md`](./docs/models.md) | Which Claude model runs which work, and the Opus-tier ceiling |
| [`glossary.md`](./docs/glossary.md) | Domain terms — bbl, COLA, GTIN, three-tier, SCD2, grain |
| [`adr/`](./docs/adr/) | Architecture decision records. ADR-0001 to ADR-0005 set the current scope, and an ADR wins where it disagrees with `PLAN.md` or `CLAUDE.md` |
| [`handoffs/`](./docs/handoffs/) | Dated session notes — the actual current state |

**Start here:** `PLAN.md` §0.1–0.4 for the mission and scope boundaries, ADR-0001 to ADR-0005 for the decisions behind them, then `CLAUDE.md` before writing anything.

## Quick start

### Prerequisites

- Node.js 22.13+
- pnpm 12+
- PostgreSQL 18 with the PostGIS and `pg_trgm` extensions

No API keys or paid accounts are needed. Every source is free, and Google Places is not used ([ADR-0001](./docs/adr/0001-non-commercial-free-sources-only.md), [ADR-0004](./docs/adr/0004-outlet-sourcing-abc-registry-and-osm.md)).

### Setup

```bash
pnpm install
cp .env.example .env          # then fill in DATABASE_URL
pnpm db:migrate
pnpm db:seed                  # loads the style taxonomy and Open Brewery DB extract
pnpm dev
```

### Common commands

```bash
pnpm lint:docs      # markdownlint over *.md and docs/ — the required check today (CLAUDE.md)
pnpm dev            # web app, local
pnpm test           # all packages — fails until a package has tests
pnpm typecheck      # fails until a package has TypeScript source
pnpm lint           # fails until a package has TypeScript source
pnpm dbt:run        # build the enrichment pipeline
pnpm dbt:test       # includes source freshness checks
```

## Repository layout

```text
apps/
  web/              Next.js 16 — map, search, filters
packages/
  types/            Shared TypeScript types; the frontend-facing contract
  api-client/       Typed client consumed by the web app
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

Brewery release data isn't in this repo. It lives in a separate public dataset repository, updated by scheduled GitHub Actions, and `pipeline/ingest` consumes it as a Tier 1 source ([ADR-0005](./docs/adr/0005-release-data-public-dataset-repo.md)). That repository's name and URL are not chosen yet.

## Conventions

Full detail in [`CLAUDE.md`](./CLAUDE.md). The load-bearing ones:

- **Four orthogonal classification axes.** Brewer independence, production scale, retail price band, and prestige are separate attributes. Never a single `quality_tier`. Goose Island 312 is the counterexample that proves it — craft-style product, non-independent brewer.
- **Availability is scored, never asserted.** No function, column, endpoint, or UI element returns a boolean stock value.
- **`dim_brewer` is SCD Type 2.** Ownership changes are the reason the independence axis means anything.
- **No source without a register entry.** Nothing may fetch from a source that lacks an entry in `docs/data-sources.md` with a verification date.
- **Every fact table states its grain explicitly.** In a sentence beginning "Grain:".
- Naming: `_sk` surrogate keys, `_natural_key` natural keys, `dim_` / `fact_` / `bridge_` table prefixes.

## Working with Claude Code

Model routing is governed by [`docs/models.md`](./docs/models.md) and enforced in `.claude/settings.json`. The ceiling is **the Opus tier** (whatever the `opus` alias resolves to); the `fable` and `best` aliases are prohibited. Session default is `opusplan` — Opus while planning, Sonnet while executing.

Start a session by reading `CLAUDE.md` and the most recent note in `docs/handoffs/`. End it with `/handoff`.

## Data and licensing

The code is MIT-licensed ([LICENSE](./LICENSE)). The project is non-commercial and uses only free sources that any self-hoster can use without an agreement of their own: no paid APIs, no partner feeds, and no BeerMenus or Untappd ([ADR-0001](./docs/adr/0001-non-commercial-free-sources-only.md)).

| Source | Provides | License / terms |
| --- | --- | --- |
| [Open Brewery DB](https://www.openbrewerydb.org/) | US breweries as brewer candidates. Only New Jersey premises become outlets ([ADR-0003](./docs/adr/0003-nj-retail-national-beer-scope.md)) | MIT |
| [TTB Public COLA Registry](https://www.ttb.gov/regulated-commodities/labeling/cola-public-registry) | National beer label records | US federal, unrestricted |
| NJ ABC licensee registry | The authoritative list of New Jersey outlets licensed for off-premise sale ([ADR-0004](./docs/adr/0004-outlet-sourcing-abc-registry-and-osm.md)) | Not yet verified; recorded in `docs/data-sources.md` on registration |
| OpenStreetMap | Outlet coordinates, opening hours, and a coverage cross-check ([ADR-0004](./docs/adr/0004-outlet-sourcing-abc-registry-and-osm.md)) | ODbL. Requires "© OpenStreetMap contributors" attribution wherever shown, and share-alike on any derived database we distribute |
| Release dataset (separate public repo) | Brewery release facts extracted from newsletters ([ADR-0005](./docs/adr/0005-release-data-public-dataset-repo.md)) | Not yet chosen |

**Google Places is not used.** Its terms prohibit storing Places content beyond place IDs, and this project warehouses outlet data. Shipping that ingest code to self-hosters would ship a terms violation ([ADR-0004](./docs/adr/0004-outlet-sourcing-abc-registry-and-osm.md)).

**BJCP content is not used.** It is licensed for non-commercial use only, which can't be passed on under MIT. Styles come from TTB class and type designations (27 CFR Part 7) plus a keyword-to-facet map maintained in this repo ([ADR-0002](./docs/adr/0002-remove-bjcp-ttb-and-keyword-facets.md)).

## Legal

BeerFinder is an information service. It does not sell, deliver, broker, or facilitate the purchase of alcohol, and it is not a participant in any tier of the three-tier system. Age verification is required for access.

Availability is estimated and may be wrong. Nothing here is legal advice.

---

*Not affiliated with any brewery, retailer, or distributor. Drink responsibly.*
