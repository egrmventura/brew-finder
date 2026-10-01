# ADR-0010 — Closed brewers: `operating_status` on the latest `dim_brewer` version

**Status:** Accepted
**Date:** 2026-10-01

## Context

The `dimensional-grain` skill requires exactly one `is_current = true` row per
`brewer_natural_key` in `dim_brewer`, and `9999-12-31` as the `effective_to` of
that row. The interim `docs/research/dim_brewer.csv` marked a closed brewer's
only version `is_current = false` with a real `effective_to`, so 30 brewers (29
closed, 1 moved out of state) had no current row. The `constraint-audit` of
2026-10-01 failed item 4 on that, and `build_tables.py` could only warn.

Nothing in the table recorded that those brewers were closed except
`effective_to` and a free-text note, and the rule that "current" meant "still
operating" was nowhere written down.

## Decision

We add `operating_status` to `dim_brewer`, with three values: `operating`,
`closed`, `moved_out_of_state`. Closure is an attribute of a brewer's latest
version, not a new version.

- Every brewer has exactly one `is_current = true` row, and it is the latest
  version, whatever its `operating_status`.
- A current `operating` row has `effective_to = 9999-12-31`. A current `closed`
  or `moved_out_of_state` row carries the closure date in `effective_to`, with
  the raw value and its source in `effective_to_reference` and
  `effective_to_basis`. If no closure date is known, `effective_to` is the
  literal `unknown`, as before.
- Only a brewer's latest version may be anything other than `operating`.
- `bridge_brewer_location` is unchanged. Its closed occupancy intervals already
  carry `is_current = false` and `occupancy_reason = closed`.

The protocol for closing a brewer is in `docs/research/README.md` § Closing a
brewer. `scripts/research/build_tables.py` enforces it and fails, rather than
warns, on a violation.

## Consequences

### What this enables

- The SCD2 test "exactly one `is_current` per natural key" passes with no
  exemption, so a brewer missing a current row is a defect again.
- Closed brewers keep their history and their key. No date is invented to open
  a closing version.
- "Is this brewer still operating" is a stored attribute, not an inference
  from `effective_to`.

### What this costs

- `is_current` no longer means "in operation". Any query that wants live
  brewers must also filter `operating_status = 'operating'`, and one that tests
  `effective_to = '9999-12-31'` to mean current will silently drop closed
  brewers.
- A fact dated after a brewer's `effective_to` finds no version under the
  skill's join rule. That is arguably right, since a closed brewer has no
  post-closure observations, but the load must handle the miss deliberately.
- A closed brewer that reopens under the same natural key leaves a gap between
  its versions. The "no gaps" SCD2 test needs an exception for it, which has
  not been written.
- The one brewer with `effective_to = unknown` still cannot pass the
  `effective_from < effective_to` test mechanically.
- The mart design is not decided here. These tables are interim, and the real
  `dim_brewer` may model ownership periods differently.

## Alternatives considered

### Closure as a new SCD2 version

A final version with `operating_status = closed`, `effective_from` equal to the
closure date, and `effective_to = 9999-12-31`. This is the textbook shape and
keeps `9999-12-31` meaning current. It lost because a version needs a known
`effective_from`, and one closed brewer has no known closure date. Making one
up would use the `PLACEHOLDER` mechanism of ADR-0007 to write a false closing
boundary into a second row, and it would also add 30 rows and keys for no new
information.

### Keep closed brewers `is_current = false` and relax the test to "at most one"

This lost because the exact-one test is the guard against a brewer silently
losing its current row. With "at most one", a bad edit that clears `is_current`
on an operating brewer passes, and every consumer has to special-case brewers
with no current row.

### Delete closed brewers from `dim_brewer`

This removes the failing rows. It lost because it destroys history that the
dimension exists to keep, and a closed brewer's key could then be reissued to
a new occupant under a new brewer.
