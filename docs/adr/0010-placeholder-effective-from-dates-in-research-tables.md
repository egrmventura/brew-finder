# ADR-0010 — Placeholder and estimated `effective_from` dates in research tables

**Status:** Accepted
**Date:** 2026-09-30

## Context

CLAUDE.md constraint 7 says never invent values: if a value is needed and not
available, stop and ask, because a placeholder written into a file is
indistinguishable from a verified one the moment the session ends.

The `docs/research/` tables (`dim_brewer.csv`, `dim_location.csv`,
`bridge_brewer_location.csv`, `fact_newsletter_target.csv`) are an interim,
hand-built SCD2 shape for brewery/newsletter-target tracking, built ahead of
the real `dim_`/`bridge_` dbt models (`docs/research/README.md`). Per the
`dimensional-grain` skill's SCD2 convention, every `dim_brewer` and
`bridge_brewer_location` row requires a non-null `effective_from` — the
convention explicitly disallows `effective_from` being `unknown` the way
`effective_to` may be.

During the 2026-09-29 research-restructure session
(`docs/handoffs/2026-09-29-research-restructure.md`), many brewer and
occupancy records had no researchable opening date: the underlying source
CSVs (`newsletter-targets.csv`, `expired-targets.csv`) don't carry one, and
targeted web research (`42 Freeway`, NJCB directory, local press) didn't
surface one either, in some cases because the search budget for that session
was exhausted before every row could be checked. Leaving `effective_from`
blank would violate the SCD2 grain rule; stopping to ask the user for 63+65
individual dates, one at a time, was impractical mid-session. At the user's
explicit direction, the session filled every missing `effective_from` with a
fallback chain instead of leaving the field blank or stopping:

1. A researched opening date, when found.
2. Otherwise, if a real `effective_to` end date exists: one month before it,
   with `effective_from_basis` prefixed `ESTIMATE:`.
3. Otherwise: the literal date `2026-09-01`, with `effective_from_basis`
   prefixed `PLACEHOLDER:`.

This is a **user-directed exception** to constraint 7, made so the SCD2 grain
rule (every row has an `effective_from`) could be satisfied without blocking
the whole restructure on unresearchable dates. The handoff note flagged it as
warranting an ADR that was not written at the time. As of this writing,
`dim_brewer.csv` carries 63 `PLACEHOLDER`/`ESTIMATE` markers and
`bridge_brewer_location.csv` carries 65 (`grep -c "PLACEHOLDER\|ESTIMATE"` on
each file).

## Decision

We record fabricated `effective_from` values in the `docs/research/`
interim tables, under exactly these conditions:

- **Scope is limited to two columns, in two files:** `effective_from` and
  `effective_from_basis` in `dim_brewer.csv` and `bridge_brewer_location.csv`.
  No other column, table, or field gets this treatment — in particular,
  `effective_to` already has its own non-invented escape hatch (the literal
  string `unknown`, per `docs/research/README.md`) and is not covered by
  this exception.
- Every fabricated value is tagged inline, in the same field, with a
  `PLACEHOLDER:` or `ESTIMATE:` prefix in `effective_from_basis` — never a
  bare date indistinguishable from a researched one.
- This is a **one-time backfill exception for the 2026-09-29 restructure
  session**, not a standing practice. It does not authorize inventing values
  in any other table, in the future `pipeline/dbt` marts, or in any later
  addition to these same CSVs — new rows added after this session need a
  real researched date or must stop and ask, per constraint 7 unmodified.

## Consequences

### What this enables

- The interim tables satisfy the SCD2 grain rule (non-null `effective_from`
  on every row) without blocking the whole restructure on rows whose opening
  date isn't published anywhere findable.
- Every fabricated value is self-flagging and mechanically findable
  (`grep -n "PLACEHOLDER\|ESTIMATE"`), rather than silently indistinguishable
  from real data — the specific harm constraint 7 warns about.

### What this costs

- **Downstream SCD2 joins keyed on `effective_from` may be wrong** for any
  of the 63 (`dim_brewer.csv`) / 65 (`bridge_brewer_location.csv`) flagged
  rows until the placeholder or estimate is replaced with a researched
  value. A fact observed near a `PLACEHOLDER: 2026-09-01` boundary could
  join to the wrong brewer version or occupancy interval.
- **There is no tracking mechanism or deadline for resolving these markers.**
  Nothing in this repository schedules their replacement, assigns an owner,
  or blocks a later pipeline stage on their removal. This is an open gap,
  not a resolved one — the `grep` above is the only current way to find them,
  and nothing runs it automatically.
- The exception itself is precedent that must be actively bounded: without
  this ADR, a future session could read the CSVs, see `PLACEHOLDER` already
  in use, and conclude fabricating values here is generally sanctioned. It
  is not — it was authorized once, for this backfill, under explicit user
  direction.

## Alternatives considered

### Leave `effective_from` blank when no date is researchable

Rejected because `dim_brewer` and `bridge_brewer_location` are SCD2 per
CLAUDE.md constraint 3 and the `dimensional-grain` skill, and that convention
requires `effective_from` to be populated on every row — unlike
`effective_to`, which has a defined `unknown` sentinel for exactly this
situation. Blank `effective_from` values would have made the grain rule
ambiguous rather than honest.

### Stop and ask the user for every missing date individually

Rejected for this session as impractical at the volume involved (128 rows
across two files) and not what the user asked for — the user directed the
fallback chain specifically instead. This ADR exists because that direction
overrides constraint 7's default ("stop and ask") for this one backfill; it
does not establish that asking-per-row is unavailable as an approach in
general.
