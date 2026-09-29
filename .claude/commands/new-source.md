---
description: Scaffold ingest for a source already registered in docs/data-sources.md. Refuses any unregistered source.
argument-hint: <source name, as its heading in docs/data-sources.md>
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(git status:*), Bash(ls:*), Bash(dbt parse:*)
model: sonnet
---

Scaffold ingest for the source **$ARGUMENTS**.

## 1. Registration gate. Run this first; it can end the command.

Find the source's entry in `docs/data-sources.md`: a `### <name>` detail block. Match on the heading, and also grep for the source's domain in case it's registered under another name.

**Refuse, and write nothing, if any of these is true.** Name the reason, then point to the `source-registration` skill (or the `source-scout` agent) as the next step.

- **No entry exists.** Registration comes before code, never after (CLAUDE.md constraint 4). Don't draft the entry here; that is a separate step that includes reading the source's terms.
- **A required field is missing.** Required: Tier, Provides, Access, License, Rate limit, Terms reviewed, Used by, last_verified, Notes. `unknown` is a valid value; a missing field is not.
- **`Terms reviewed` isn't `yes` with a date.**
- **`last_verified` is more than one quarter old.** Re-verification is quarterly. Ask for re-verification before scaffolding.
- **Access, License, or Rate limit is `unknown`.** A source registered with gaps gets no code yet.
- **Tier 2.** It may not be used.
- **Tier 3 with no accepted ADR in `docs/adr/` authorizing it.** An ADR that is cited but doesn't exist counts as missing.
- **Tier 4.** It's dead.
- **It's paid or partner-gated** (ADR-0001), or **it's Google Places** (ADR-0004).

Report the gate result line by line: each check, PASS or FAIL, and the line of the entry it rests on.

## 2. Scaffold

Only once every gate check passes. Take every value from the registry entry: endpoint, rate limit, license, and update cadence. **Never invent an endpoint, a field name, a rate limit, or a freshness threshold.** If a value you need isn't in the entry, stop and ask.

1. **Ingest module** in `pipeline/ingest/`.
   - Follow the language and structure of the existing modules there.
   - If none exist yet, stop and ask which language to use; don't choose one.
   - Self-limit requests to the registered rate limit, and identify the client honestly.
   - Write raw data with an `_ingested_at` timestamp (UTC).
2. **Source declaration** in `pipeline/dbt/models/staging/<source>/_<source>__sources.yml`, per `dbt-conventions`. The freshness block's `warn_after` and `error_after` values come from the cadence recorded in the entry. If no cadence is recorded, stop and ask.
3. **Staging model(s)**, `stg_<source>__<entity>.sql`, per `dbt-conventions`: select from `source()` only, then rename, cast, and deduplicate. Nothing else.
4. **`schema.yml` tests**: `not_null` and `unique` on the primary key, plus `accepted_values` on every column with a controlled vocabulary.
5. **Update `Used by`** in the registry entry to name the new module and staging model(s). Change nothing else in the entry.

No marts. Schema work in `models/marts/` goes through `/model-check` first.

## 3. Report

- The gate table from step 1
- Every file created or changed
- Every command actually run and its result. `dbt parse` if dbt is available; if it isn't, write "not run — dbt unavailable". Never describe the scaffold as validated without a command that was run.
- Every value you needed but did not have, listed under **Open**
