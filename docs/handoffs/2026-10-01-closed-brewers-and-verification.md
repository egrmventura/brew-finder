# 2026-10-01 — Closed-brewer status and verification run

## Scope

Close the three failed `constraint-audit` items (4 SCD2, 12 verification honesty, 13 placeholders) from the WP1 branch review, after the closed-brewer change in `a63dfce`. This note corrects the earlier `2026-10-01-wp1-staging-review-fixes.md`, which marked several checks **not run** that were run afterwards.

## Changed

From `git diff --stat df9d51f` (the first three files are committed in `a63dfce`; the rest are in this commit):

- `docs/research/dim_brewer.csv` — new `operating_status` column; the 30 brewers with no current row now have `is_current = true` and a `closed` (29) or `moved_out_of_state` (1) status (ADR-0010).
- `docs/adr/0010-closed-brewer-status-in-dim-brewer.md` — new; the decision, its costs, and three rejected alternatives. After `/code-review` found its "only the latest version may be non-`operating`" sentence contradicted README rule 6's reopen case, that Decision bullet was reworded after the ADR was pushed (a correction, not a new decision; supersede it with ADR-0011 if you want the record strict).
- `docs/taxonomy-decisions.md` — ADR-0010 added to the index.
- `scripts/research/build_tables.py` — fails on: not exactly one current row, a current row that is not the latest version, a closed version with an open-ended `effective_to`, overlapping versions, a gap after an `operating` version, `effective_from` not before `effective_to`, and a fact row pointing at the wrong or an unresolvable version.
- `docs/research/README.md` — rule 6 (closing a brewer) and rule 7 (fact rows point at the version valid on their date).
- `docs/architecture.md` — `dim_brewer` and `fact_newsletter_target` notes.

## Verified

Run against a throwaway Postgres 16.14, with only migration `0002` applied and the `beerfinder_readonly` role created by hand. Postgres 18 and PostGIS were not available.

| Command | Result |
| --- | --- |
| `pnpm lint:docs` | pass — 0 issues |
| `pnpm typecheck` | **not run** — no TypeScript source; not yet in the required check |
| `pnpm lint` | **not run** — same reason |
| `pnpm test` | **not run** — no tests exist |
| `pnpm dbt:run` | pass — PASS=2, with `DATABASE_URL` pointed at the throwaway server |
| `pnpm dbt:test` | pass — PASS=9, on the 2-row table the loader probes left behind |
| `scripts/ingest/load_open_brewery_db.mjs` | pass on 4 probes with `fetch` stubbed: first load (3 rows, removed 0), second load (2 rows, removed 1, `id-0,id-1` remain), error-object body (exit 1, clear message, table unchanged), zero rows (refused) |
| `build_tables.py --check` | pass on the real tables; **fail as intended** on 7 bad copies (cleared current row, bogus status, closed-looking operating row, undated fact on a 2-version brewer, fact dated in the wrong version, `effective_to` before `effective_from`, gap after an operating version); accepts a reopen after a closed version |
| Key stability | pass — adding one brewer, location, bridge and fact row left all 253 + 266 existing keys unchanged |
| Key values vs Postgres `md5()` | pass — 253/253 brewer and 266/266 location keys match |
| `pnpm db:up`, `pnpm db:migrate`, migration `0001` | **not run** — no Docker daemon; `migrate.mjs`'s PostGIS floor check is unobserved |
| Loader against the real API | **not run** — `fetch` was stubbed |
| Keys vs `dbt_utils.generate_surrogate_key` | **not run** — `dbt deps` was not run; only the equivalent `md5()` expression was checked |
| `/code-review` (`3b10351..HEAD`, high) | one finding: ADR-0010 and the validator disagreed on non-latest closed versions. Fixed (validator allows the reopen case, ADR reworded). The loader and dbt models were read, not run, by the reviewer; no re-review of the fix |
| `constraint-audit` (`3b10351` to working tree) | 1 pass, 2 N/A, 3 pass, 4 pass, 5 N/A, 6 pass, 7 pass, 8 N/A, 9 pass, 10 pass, 11 pass, 12 pass, 13 pass. Run by the author of the change, so it is not independent; item 4 passes on the generator standing in for `schema.yml` tests, which the real mart still needs |

## Decisions

- Closure is an attribute of the latest `dim_brewer` version, not a new version: ADR-0010, written.
- An undated fact row may point only at a single-version brewer; no dates were added to the 60 undated rows. Recorded in README rule 7; warrants no ADR.
- The generator stands in for a `schema.yml` on the CSVs. No ADR; the mart tests belong to `data-modeler`.

## Open

- Re-run `/code-review` on the ADR-0010 and validator fix, and have someone other than the author run `constraint-audit`. Blocks merge.
- `third_state_brewing` has `effective_to = unknown`, which the generator reports as a warning. Blocks a clean SCD2 run.
- No `schema.yml` SCD2 tests exist; the generator stands in until the real `dim_brewer` mart.
- `migrate.mjs`'s PostGIS 3.6.3 floor is unobserved; the 3.6.3 figure comes from `docker-compose.yml`'s documented upstream issue (#6026), not a guess.
- ADR-0008 attributes two answers to the user; unconfirmed.
- `docs/taxonomy-decisions.md` still lacks rows for ADR-0007, 0008 and 0009.
- 13 newsletter targets are unsafe to subscribe to; blocks any signup run.
- Guessed values:
  - `pipeline/dbt/models/staging/open_brewery_db/_open_brewery_db__sources.yml:17-18` — freshness 30/90 days.
  - `scripts/ingest/load_open_brewery_db.mjs:23` — 1 request/second.
  - `pipeline/dbt/profiles.yml:13` — `threads: 4`.
  - `docs/research/dim_brewer.csv` (63) and `bridge_brewer_location.csv` (65) — `PLACEHOLDER`/`ESTIMATE` dates, ADR-0007; list with `grep -n "PLACEHOLDER\|ESTIMATE"`.

## Next

- In a Docker-capable clone run `pnpm db:up && pnpm db:migrate && pnpm dbt:run && pnpm dbt:test` against Postgres 18 with PostGIS, and record the output in a new handoff.
