# 2026-10-01 — WP1 staging review and loader fixes

## Scope

Review the branch `feat/research-keys-and-wp1-staging` (commits after `3b10351`, none previously handed off) with `/code-review` and `constraint-audit`, then fix the two low-severity loader findings. Both review passes ran in an earlier part of the session; this note's author did not observe their runs and relies on their written reports.

## Changed

From `git diff --stat 3b10351..HEAD` (working tree clean; all commits pushed):

- `scripts/ingest/load_open_brewery_db.mjs` — new (`04c3346`); this session (`502af49`) added a non-array response check and a same-transaction delete of rows absent from the latest fetch.
- `db/migrations/0002_raw_open_brewery_db.sql` — new; raw table for Open Brewery DB.
- `pipeline/dbt/models/staging/open_brewery_db/` — new: `_open_brewery_db__sources.yml`, `stg_obdb__breweries.sql`, `stg_obdb__breweries.yml`.
- `docs/adr/0007`, `0008`, `0009` — new; placeholder dates in research tables, newsletter signup email storage, plain-SQL migrations.
- `scripts/research/build_tables.py` — new; derives `brewer_sk`/`location_sk` deterministically (`7ad27e2`).
- `docs/research/{dim_brewer,dim_location,bridge_brewer_location,fact_newsletter_target}.csv` — regenerated with the new keys.
- `docs/research/README.md`, `docs/architecture.md` — `Grain:` declarations for the four tables.
- `docs/data-sources.md` — Open Brewery DB "Used by" filled in.
- `.gitignore` — `.claude/settings.local.json` ignored (`95e1b39`, message says "temp").

## Verified

| Command | Result |
| --- | --- |
| `pnpm lint:docs` | pass — 24 files, 0 issues |
| `pnpm typecheck` | **not run** — no TypeScript source; not yet in the required check |
| `pnpm lint` | **not run** — same reason |
| `pnpm test` | **not run** — no tests exist |
| `pnpm dbt:run` / `pnpm dbt:test` | **not run** — no Docker daemon in this environment (`pnpm db:up` failed). The agents' earlier PASS=2 / PASS=9 claims were not observed |
| `node --check` on the loader | pass — syntax only |
| Loader delete and non-array paths | **not run** — needs the database and the API |
| Key-stability test | **not run** — scripts exist only in a scratchpad |
| `/code-review` | reported: no high-confidence bugs; two low findings, both fixed in `502af49`; no second review of the fixes |
| `constraint-audit` | reported: 7 pass, 3 fail (4, 12, 13), 3 N/A; 12 and 13 are addressed by this note, 4 is open |

## Decisions

- Deleting rows absent from the latest fetch is safe because each load is a full New Jersey snapshot, and the zero-row guard prevents an empty fetch from wiping the table. No ADR.
- No automated test for the loader: the first test would change the required check, and the script needs refactoring first. No ADR.
- ADR-0007, 0008 and 0009 exist for earlier decisions; the migration-tooling ADR open in the 2026-09-29 note is now 0009.

## Open

- **SCD2 (audit item 4):** 30 closed brewers have no `is_current = true` row, and 60 `fact_newsletter_target` rows point at the current brewer version with no date. Needs the user's decision; blocks merge.
- ADR-0008 says the user gave two answers directly; unconfirmed. Blocks relying on its email-storage decision.
- Dbt checks and the loader changes are unrun; they block adding `dbt:run`/`dbt:test` to the required check.
- 13 newsletter targets are unsafe to subscribe to (2026-09-29 note); still blocks any signup run.
- Guessed values:
  - `pipeline/dbt/models/staging/open_brewery_db/_open_brewery_db__sources.yml:17-18` — freshness 30/90 days.
  - `scripts/ingest/load_open_brewery_db.mjs:23` — 1 request/second self-limit.
  - `docs/research/dim_brewer.csv` — 63 `PLACEHOLDER`/`ESTIMATE` rows.
  - `docs/research/bridge_brewer_location.csv` — 65 `PLACEHOLDER`/`ESTIMATE` rows. List with `grep -n "PLACEHOLDER\|ESTIMATE"`; covered by ADR-0007.
- `docs/data-sources.md`: Open Brewery DB `last_verified` is still 2026-09-23, and the loader uses the API where the entry prefers the bulk dump.

## Next

- Run `pnpm db:up && pnpm db:migrate && pnpm dbt:run && pnpm dbt:test` in a Docker-capable clone, then the loader twice with one stale row inserted between runs, and record the observed output in a new handoff.
