# 2026-09-29 — Research tables restructure

## Scope

Restructure the newsletter research CSVs into brewer / location / occupancy / newsletter-target tables, fill `effective_from` dates by research, add websites and a blank `email` field to the targets, and audit the result (sessions of 2026-09-28 and 2026-09-29).

## Changed

- Commit `a3d8880` (made by the user, 2026-09-29) holds this session's table work; `git diff --stat` against it is empty:
  - `docs/research/dim_brewer.csv`, `dim_location.csv`, `bridge_brewer_location.csv`, `fact_newsletter_target.csv` — new; generated from the two target CSVs, with researched dates, `_reference`/`_basis` date columns, websites, and a blank `email` column.
  - `docs/research/README.md` — new; the five CSV rules, source-field mapping, identity-matching rules, known limitations.
  - `docs/research/newsletter-targets.csv`, `expired-targets.csv` — reformatted: quoting rule; `expired-targets` closure dates padded to `yyyy-mm-dd`, raw value moved to `closure_date_reference`.
  - Also in that commit, not written this session: `docs/data-sources.md`, `docs/compact-notes/keep-mac-awake-caffeinate.md`, `docs/research/nj-breweries-as-of-2026-09-01.csv`, `docs/research/sample-run.csv`.
- `docs/research/notes/notes-2026-09-29-health-of-reseach-docs.md` — untracked; local copy of the audit. Shareable page: <https://claude.ai/artifact/UQqgPHPNLiYpowGvbbLxee> (private until shared).

## Verified

| Command | Result |
| --- | --- |
| `pnpm lint:docs` | **fail** — 2 × MD040 in `docs/compact-notes/keep-mac-awake-caffeinate.md` (from an earlier session); no issues in files written this session |
| `pnpm typecheck` | **not run** — not in the required check until WP1; no package has TypeScript source |
| `pnpm lint` | **not run** — same reason |
| `pnpm test` | **not run** — same reason |
| `pnpm dbt:run` / `dbt:test` | **not run** — `pipeline/dbt` not touched |
| Python checks over the four CSVs (scratchpad scripts) | pass — column counts, key uniqueness, references, no date overlaps, `yyyy-mm-dd` formats, every source field carried |
| Same checks, SCD2 rule "one current row per brewer" | **fail** — 30 closed brewers have none; Third State rename boundary `unknown` |
| Key-stability test (one row added to a source copy) | **fail** — 237 of 253 `brewer_sk` values reassigned |

## Decisions

- Interim four-table shape lives in `docs/research/`, not `pipeline/dbt`. No ADR; data-modeler owns the real marts.
- Missing start dates: researched date, else 1 month before a real `effective_to` (`ESTIMATE:`), else `2026-09-01` (`PLACEHOLDER:`). User-directed exception to CLAUDE.md constraint 7; **warrants an ADR, none written**.
- Same brewer across rows only when the source `reason` says `renamed`/`relocated`, or current rows share a website domain and name stem. Ambiguous cases left unmerged. No ADR; belongs in the future `entity-resolution` skill.
- `website` and blank `email` added to `fact_newsletter_target` at the user's request. Where emails are stored conflicts with ADR-0005; **warrants an ADR, none written**.

## Open

- 13 target rows unsafe to subscribe to (closed, duplicate, not a brewery, hijacked or dead domains) — blocks any signup run. List in the notes file.
- `brewer_sk` values renumber on any source change — blocks entering emails.
- Generator scripts, research results and the full 36-item data-problem list exist only in this session's scratchpad (`/private/tmp/claude-501/…/b626b8fc-…/scratchpad/`) and will be lost — blocks rebuilding the tables.
- No `Grain:` declarations for the four tables or in `docs/architecture.md`.
- Guessed or unverified values: 39 `PLACEHOLDER` + 26 `ESTIMATE` `effective_from` values in `bridge_brewer_location.csv` (37 + 26 in `dim_brewer.csv`); list them with `grep -n "PLACEHOLDER\|ESTIMATE"`. 52 were never researched (web-search limit).
- 5 targets have no website; 4 websites are social-media pages; 18 websites came from `nj-breweries-as-of-2026-09-01.csv`, whose origin is undocumented.

## Next

- Commit a generator at `scripts/research/build_tables.py` that derives `brewer_sk`/`location_sk` from the natural key plus `effective_from`, regenerate the four CSVs, and confirm keys are unchanged after adding a test row.
