# ADR-0009 — Plain SQL migrations, run by a small Node script

**Status:** Accepted
**Date:** 2026-09-30

## Context

WP1 (`docs/handoffs/2026-09-29-wp1-local-infra.md`) needed a way to apply schema
changes — extensions, the `beerfinder_readonly` role, and later raw/staging
tables — to the local Postgres in a repeatable order, with a record of what had
already run so a second invocation was a no-op rather than a re-application.
The handoff's Decisions section states the choice made but flags that it
"warrants an ADR; none written." This ADR records it.

A migration tool was needed because:

- `db/init/*.sql` only runs once, on an empty Docker volume, so it cannot carry
  later changes to an existing database.
- Self-hosters (ADR-0001) run Postgres without Docker at all in some cases, so
  anything Docker-specific does not reach them.
- Schema changes have to land in an order that later changes can depend on
  (the `beerfinder_readonly` role has to exist before a migration grants to
  it), and re-running the same set of files must not reapply anything already
  applied.

The realistic alternatives were a migration framework — Flyway, Sqitch,
node-pg-migrate, Prisma Migrate — or a small script that runs ordered,
plain-SQL files itself.

## Decision

Migrations are **plain, ordered `.sql` files in `db/migrations/`, applied by
`scripts/db/migrate.mjs`**, a small Node script using `pg` directly. Each file
runs in its own transaction; the script records the filename in
`public.schema_migrations` after it commits, and skips any filename already
recorded. There is no migration framework, no DSL, and no generated
migration format — a new migration is a new `.sql` file, added by hand, named
to sort after the ones before it.

The script also carries two pieces of environment-specific logic that a
generic framework would not: refusing a PostGIS older than 3.6.3 (both the
package on disk and the extension/library actually loaded), and resetting
`beerfinder_readonly`'s password from `BEERFINDER_READONLY_PASSWORD` on every
run, so rotating the variable takes effect without a new migration file.

## Consequences

### What this enables

- **No new dependency.** Flyway needs a JVM, Sqitch needs Perl, node-pg-migrate
  and Prisma Migrate are still a dependency and an opinionated file format on
  top of what `pg` already gives us. A self-hoster installs nothing beyond
  what `pnpm install` already pulls (ADR-0001's 30-minute clone-to-running
  target).
- **A migration is just SQL.** Anyone who can read `CREATE TABLE` can read and
  review every migration in this repo; there is no framework-specific syntax,
  templating language, or generated boilerplate to learn first.
- **The script can carry project-specific checks inline** — the PostGIS
  version guard and the read-only password reset — without fighting a
  framework's plugin model to do it.

### What this costs

These are the same two gaps the WP1 handoff's Open section already named, and
they remain unaddressed as of this ADR:

- **No advisory lock.** `scripts/db/migrate.mjs` does not take a Postgres
  advisory lock (or any other mutual-exclusion mechanism) before reading
  `public.schema_migrations` and applying pending files. Two concurrent runs —
  two terminals, or a developer and a CI job — can both decide the same file
  is pending and both try to apply it, racing on the same DDL. A real
  migration framework (Flyway, Sqitch) takes a lock as standard behavior;
  building that correctly here is exactly the kind of thing a framework buys.
- **No checksum of applied files.** The script tracks only the filename in
  `public.schema_migrations`, not a hash of its contents. Editing a migration
  file after it has already been applied on a given database is silently
  ignored on that database — the file is still in `schema_migrations`, so it
  is never re-read — while a fresh database that applies it for the first time
  gets the edited version. The two databases now disagree about their schema
  history with no error raised anywhere.

Both gaps are named rather than fixed here because they block nothing at the
project's current scale: one developer, one local database, no CI pipeline
running migrations yet. They are real risks, not resolved ones, and they get
worse the moment either a second developer or a scheduled CI migration run
enters the picture.

## Alternatives considered

### A migration framework (Flyway, Sqitch, node-pg-migrate, Prisma Migrate)

Each of these solves the advisory-lock and checksum gaps above as a built-in
feature, which plain SQL does not. Each also adds a dependency the project
does not otherwise need — a JVM for Flyway, Perl and its own metadata schema
for Sqitch — or, for node-pg-migrate and Prisma Migrate, a JavaScript
dependency plus a framework-specific migration format (a `.js`/`.ts` file
exporting `up`/`down` functions, or Prisma's own schema and migration
directory layout) instead of a `.sql` file anyone can read top to bottom. At
one developer and no CI migrations yet, the concurrency and drift problems
those frameworks solve are not occurring; the dependency and format cost of
adopting one now is real and immediate.
