# 2026-09-23 — Phase 0 baseline

## Scope

Record the Phase 0 baseline: waves 0 and 1 merged, the scope revision and ADR-0001 to ADR-0005 accepted, and bootstrap closed (commands, docs, and a real required check).

## Changed

**Merged to `main`** (per `git log`):

- Wave 0 and wave 1: PR #1 on 2026-09-18 and PR #2 on 2026-09-20, both from `chore/wave-01-inserts`:
  - `PLAN.md` and `CLAUDE.md` (`abd8503`, `07636b3`, `0bacdf1`)
  - monorepo scaffold and doc stubs (`ac7cac5`)
  - 9 skills (`94f6c1f`, `da82abc`, `4f8cb9b`, `032340f`)
  - 6 agents (`94f6c1f`, `7861459`)
  - `NOTES.md` (`aadccbe`)

**Committed on `chores/wave-02-revisions`, not merged** (`05d2f1d`, 2026-09-23):

- `docs/adr/0001`–`0005`: scope revision. Non-commercial, no BJCP, NJ retail with national beers, ABC registry plus OSM, release dataset repo
- `PLAN.md`, `CLAUDE.md`, `README.md`: reconciled to the ADRs
- `.claude/skills/style-taxonomy`, `.claude/skills/constraint-audit`: BJCP overlay replaced by the keyword map and a no-BJCP check
- `.claude/agents/data-modeler.md`: a 2-line edit

**Uncommitted** (per `git status`):

- `.claude/commands/*.md`: the five commands (`plan-phase`, `new-source`, `model-check`, `scoring-eval`, `handoff`)
- `docs/models.md`, `docs/data-sources.md`, `docs/taxonomy-decisions.md`, `docs/glossary.md`: populated
- `docs/architecture.md`: skeleton only
- `docs/handoffs/TEMPLATE.md`: new
- `.markdownlint-cli2.jsonc`, plus `lint:docs` and `markdownlint-cli2` in `package.json` / `pnpm-lock.yaml`: the docs check
- `scripts/require-workspace-script.mjs`, plus the `test` script in `package.json`: `pnpm test` now fails when no package defines tests
- `apps/mobile/` deleted; `pnpm-workspace.yaml`, `.gitignore`, and `PLAN.md` §6 and §9 updated to match
- `.env.example`: `DATABASE_URL` only
- `CLAUDE.md` § Commands: the required check is `pnpm lint:docs` until WP1
- Every root `*.md` and `docs/**`: markdownlint auto-fix (whitespace and table delimiter rows only), plus code blocks labelled `text`

## Verified

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | pass |
| `pnpm lint:docs` | pass — 0 issues, 17 files, including this note. It fails (exit 1) on a deliberately malformed probe file |
| `pnpm typecheck` | fail — `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT`. No package has TypeScript source; not part of the required check until WP1 |
| `pnpm lint` | fail — `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT`, for the same reason |
| `pnpm test` | fail — the guard reports no workspace package defines `test`. It passes through when one does (probed, then reverted) |
| `pnpm dbt:run` / `pnpm dbt:test` | **not run** — `pipeline/dbt/` has no dbt project |
| `pg_isready` | pass — accepting connections on `/tmp:5432` |
| Postgres version, PostGIS, `pg_trgm` | **not run** — `psql` requires a password that isn't configured |
| `/plan-phase`, `/new-source`, `/model-check`, `/scoring-eval`, `/handoff` | **not run** — created but never invoked |

## Decisions

- **ADR-0001 to ADR-0005 accepted.** All five are written and committed in `05d2f1d`.
- **Phase 5 (feedback loop) cut** per ADR-0001. **Phase 6 (mobile) cut** with no ADR; it warrants one, and none has been written.
- **The required check is `pnpm lint:docs` until WP1** (CLAUDE.md § Commands). `typecheck`, `lint`, and `test` fail honestly until they have something to check. No ADR needed.
- **The model ceiling is Opus 5.5,** per the user's edit to `docs/models.md`. No ADR needed.

## Open

- **WP3: the `entity-resolution` skill doesn't exist.** Under CLAUDE.md's gate, it blocks the Phase 2 alias table and resolver and the Phase 2.5 name resolution.
- **The `scoring-eval-protocol` skill doesn't exist either.** It blocks `packages/scoring` and `/scoring-eval`, so bootstrap isn't fully closed.
- **Is Postgres/PostGIS provisioned?** A server is accepting connections locally, but its version, PostGIS, and `pg_trgm` are unconfirmed because authentication isn't set up. This blocks Phase 1 geo work.
- **The `dbt` on PATH is the dbt Cloud CLI 0.35.7,** not dbt-core with the DuckDB adapter the stack specifies. `pnpm dbt:*` would call the wrong tool.
- **The model ceiling is stated inconsistently.** `CLAUDE.md` § Model policy and `README.md` still say "Opus 5", while `docs/models.md` says Opus 5.5, and its own Open item on the question is now stale.
- **The commands carry no `model:` line.** The `docs/models.md` routing table is the proposed source.
- **Stale BJCP rules in `.claude/agents/data-modeler.md`** (lines 36 and 72) contradict ADR-0002.
- **PLAN.md still contradicts the ADRs in several places:** §2.4, §2.6, §3 tier tables, §4 cold start, §5 `bridge_style_attribute` and `source_system`, §8, and open questions 3 and 5.
- **Placeholder scan:** nothing guessed. The only version strings in the diff are ones pnpm resolved in `package.json` and `pnpm-lock.yaml`.

## Next

- **Track B1: draft the newsletter target list.** This means the breweries whose newsletters the ADR-0005 inbox will subscribe to, each with its signup source and terms-review status. First decide where the list lives: ADR-0005 puts the per-newsletter register in the dataset repo, which doesn't exist yet.
