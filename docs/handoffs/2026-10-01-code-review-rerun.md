# 2026-10-01 — Code-review re-run and loader finding

## Scope

Re-run `/code-review` on the validator and ADR-0010 fix, and record the outcome. This note corrects `2026-10-01-closed-brewers-and-verification.md`, whose Verified table says the fix had no re-review and lists `/code-review` as finding only the ADR-0010 inconsistency.

## Changed

From `git status` (no tracked file changed; HEAD is `005d350`, pushed):

- `docs/handoffs/2026-10-01-code-review-rerun.md` — new; this note. No code, data or ADR changed.

## Verified

| Command | Result |
| --- | --- |
| `pnpm lint:docs` | pass — 0 issues |
| `pnpm typecheck` | **not run** — no TypeScript source; not yet in the required check |
| `pnpm lint` | **not run** — same reason |
| `pnpm test` | **not run** — no tests exist |
| `pnpm dbt:run` / `pnpm dbt:test` | **not run** this note; the earlier note recorded PASS=2 / PASS=9 on a throwaway Postgres 16 |
| `/code-review` on `3b10351..HEAD`, high | no finding on the validator or ADR-0010 fix; one new finding on the loader (below). The reviewer re-ran `build_tables.py --check` and `pnpm lint:docs`, and did not run the loader, dbt or the bad-input probes. CSV rewrites were not checked row by row beyond the script |
| `constraint-audit` | **not run** this note; the earlier note's result stands, and it was run by the change's author, not independently |

## Decisions

- Accept the loader finding for now rather than fix it (option 3 of three). No code changed. No ADR; the loader is manual, one page of data, one developer.

## Open

- **Loader can delete valid rows** (`scripts/ingest/load_open_brewery_db.mjs:30` fetch, `:124` delete; plausible, unconfirmed): it treats the fetched rows as the full New Jersey snapshot and deletes every other row in `raw.open_brewery_db_breweries`. A short or reordered page would delete valid breweries. Only a zero-row fetch is guarded. New Jersey is about 115 rows on one 200-row page, so this is unlikely today. Revisit if the dataset nears one page, if the loader is scheduled, or before relying on the delete. Candidate fixes: check the API's own total, if it exposes one (unchecked), or refuse the delete when the fetch shrinks sharply, which would need a threshold that is a guess.
- A second reviewer, not the change's author, still needs to run `constraint-audit`. Blocks merge.
- Postgres 18 with PostGIS, `db:up` and `db:migrate` remain unrun; `migrate.mjs`'s PostGIS floor check is unobserved.
- `third_state_brewing` has `effective_to = unknown`, reported by the generator as a warning.
- ADR-0008 attributes two answers to the user; unconfirmed.
- `docs/taxonomy-decisions.md` still lacks rows for ADR-0007, 0008 and 0009.
- Guessed values listed in the earlier note are unchanged: freshness 30/90 days (`pipeline/dbt/models/staging/open_brewery_db/_open_brewery_db__sources.yml:17-18`), 1 request/second (`scripts/ingest/load_open_brewery_db.mjs:23`), `threads: 4` (`pipeline/dbt/profiles.yml:13`), and 63 + 65 `PLACEHOLDER`/`ESTIMATE` CSV rows. This note adds none.

## Next

- Ask someone other than the author to run `constraint-audit` on `3b10351..HEAD`, and record the result in a new handoff.
