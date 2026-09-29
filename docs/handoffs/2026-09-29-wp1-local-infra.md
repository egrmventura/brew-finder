# 2026-09-29 — WP1 local infrastructure

## Scope

Stand up local Postgres 18 + PostGIS + `pg_trgm` in Docker, a SELECT-only role, a dbt-core project targeting that Postgres directly (ADR-0006), and the `db:up` / `db:migrate` / `dbt:run` / `dbt:test` scripts. Branch `feat/wp1-local-infra`.

## Changed

- `docker-compose.yml` — new. `postgis/postgis:18-3.6` (amd64 only, so emulated on Apple Silicon), port on 127.0.0.1, volume at `/var/lib/postgresql` (Postgres 18 layout), TCP health check.
- `db/init/20_pg_trgm.sql` — new; creates `pg_trgm` on first start, after the image's `10_postgis.sh`.
- `db/migrations/0001_extensions_and_readonly_role.sql` — new; extensions, `beerfinder_readonly` (SELECT only, default read-only sessions, no TEMP), default privileges.
- `scripts/db/migrate.mjs` — new; ordered SQL migrations in `public.schema_migrations`; refuses PostGIS < 3.6.3; sets the read-only password every run.
- `scripts/db/database-url.mjs` — new; `DATABASE_URL`, else built from `POSTGRES_*` (single source); `POSTGRES_*` limited to letters, digits, `- _ .`.
- `scripts/dbt.mjs` — new; runs dbt from `pipeline/.venv` only (never the dbt Cloud CLI on PATH), splits the URL for the profile the way `pg` decodes it, fails `run`/`test` when `dbt ls` finds no models or no tests.
- `pipeline/dbt/` — new project: `dbt_project.yml`, `profiles.yml` (env vars only), `generate_schema_name` macro (schemas `staging`/`intermediate`/`marts`), grants to the read-only role; replaces `.gitkeep`.
- `pipeline/requirements.txt` — new; `dbt-core==1.12.5`, `dbt-postgres==1.11.0`.
- `package.json`, `pnpm-lock.yaml` — scripts `db:up`, `db:migrate`, `dbt:run`, `dbt:test`; dev dependency `pg` 8.23.0. `db:seed` stub kept (user's choice).
- `.env.example` — `POSTGRES_*` local defaults, `DATABASE_URL` commented out, `BEERFINDER_READONLY_PASSWORD`.
- `.gitignore` — `pipeline/.venv/`, `pipeline/dbt/.user.yml`.
- `README.md` — Quick start (Docker, venv), commands, layout.

Not in this commit: the deletion of `docs/compact-notes/keep-mac-awake-caffeinate.md` (made outside this session) and `docs/research/notes/`.

## Verified

| Command | Result |
| --- | --- |
| `pnpm lint:docs` | pass — 21 files, 0 issues (the caffeinate note that failed before is deleted in the working tree) |
| `pnpm typecheck` | **not run** — no TypeScript source; not yet in the required check |
| `pnpm lint` | **not run** — same reason |
| `pnpm test` | **not run** — no tests exist |
| `pnpm db:up` | pass — healthy; Postgres 18.6, PostGIS 3.6.4, pg_trgm 1.6 (queried in the container) |
| `pnpm db:migrate` ×2 | pass — applies 0001 once, then "nothing to apply" |
| Read-only role probes | pass — SELECT works; INSERT/DELETE/TRUNCATE/CREATE/CREATE SCHEMA/TEMP denied even with read-only sessions off |
| Password rotation | pass — a `$`-heavy password logs in exactly; the old one is refused |
| `dbt debug` via `scripts/dbt.mjs` | pass — dbt-core 1.12.5, postgres 1.11.0, connection OK |
| `pnpm dbt:run` / `dbt:test`, throwaway model + test | pass — table in `marts`, readable by the read-only role; probe deleted |
| `pnpm dbt:run` / `dbt:test`, empty project | fail, by design — no models / no tests |
| Error paths (unsafe `.env` chars, `%` in URL, query string, encoded socket host, server down, missing role, broken venv binary, PostGIS outside `search_path`, connection killed mid-migration) | pass — each gives its message; the killed migration exits 1 and is not recorded |
| `dbt:run`/`dbt:test` guard via `dbt ls` | pass — fails with no models, with only a disabled model, with a model but no tests, with only a generic-test definition; runs once a test exists |
| PostGIS < 3.6.3 refusal | **not run** against a real old PostGIS; version comparison checked on 9 inputs only |
| PostGIS library-load failure message | **not run** — no broken library to test against |
| `/code-review` | four passes, all findings fixed except the deferred lock/checksum. The fixes from pass 4 were checked by the rows above; **no fifth review ran on them** |
| `constraint-audit` | 5 pass, 1 fail (13: values below, cleared by this note), 7 N/A |

## Decisions

- Official `postgis/postgis:18-3.6`, emulated, over native `imresamu/postgis`: its newest tag is PostGIS 3.6.1, and 3.6.3 fixes a KNN failure (#6026) on the `<->` ordering radius search uses. User's rule; no ADR (dev tooling), recorded in `docker-compose.yml`.
- Migrations are plain SQL run by a small Node script, not a framework. **Warrants an ADR; none written.**
- `dbt:run`/`dbt:test` fail on an empty project rather than pass on nothing (CLAUDE.md § Commands). No ADR.

## Open

- Chosen, not derived: health check `interval 5s`, `timeout 5s`, `retries 20`, `start_period 30s` (`docker-compose.yml:33-36`); `threads: 4` (`pipeline/dbt/profiles.yml:13`); local-only dev passwords (`.env.example:18`, `:28`).
- `db:migrate` has no advisory lock and no checksum of applied files: concurrent runs can collide, and edits to an applied migration are ignored. Blocks nothing at one developer.
- This machine: a PostgreSQL 16 system install holds 5432, so the local `.env` uses `POSTGRES_PORT=5433`.
- `db:seed` still fails "not implemented" until seed data exists.

## Next

- Write the migration-tooling ADR (plain SQL + `scripts/db/migrate.mjs`), then add the first staging model and source with tests, so `pnpm dbt:run` and `pnpm dbt:test` join the required check.
