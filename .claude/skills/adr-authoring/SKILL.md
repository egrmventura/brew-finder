---
name: adr-authoring
description: Writing and superseding architecture decision records. Use when recording a design decision, creating a file in docs/adr/, changing a decision that was already recorded, or when asked why the project does something a particular way.
allowed-tools: Read, Write, Edit, Grep, Glob
---

# Architecture decision records

An ADR records **why**, at a point in time, with the alternatives that lost. Code shows what the decision was. Only the ADR shows what it cost and what was given up.

## File and numbering

`docs/adr/NNNN-kebab-case-title.md` — four digits, zero-padded, allocated sequentially.

Numbers are permanent. Never reuse a number, never renumber, never delete an ADR. A rejected proposal stays in the tree with status `Rejected`. The gap in a sequence is itself information.

Before allocating a number, list `docs/adr/` and take the next one. If two land simultaneously, the second renumbers itself — never the first.

## Structure

```markdown
# ADR-0001 — Four orthogonal classification axes

**Status:** Accepted
**Date:** 2026-09-16

## Context
[The situation that forced a decision. What was true, what was in tension,
what would have happened with no decision at all. No solution language here.]

## Decision
[What we are doing, present tense, active voice. "We model independence,
scale, price band, and prestige as four separate attributes."]

## Consequences
[What follows. Both directions — required.]

### What this enables
...

### What this costs
...

## Alternatives considered
### [Alternative name]
[What it was, and the specific reason it lost. Not "less flexible" —
the actual failure case.]
```

## Status values

| Status | Meaning |
|---|---|
| `Proposed` | Written, not agreed. May be edited freely |
| `Accepted` | In force. The Context and Decision sections are now frozen |
| `Superseded by ADR-NNNN` | Replaced. Body unchanged |
| `Rejected` | Considered and declined. Kept so it isn't re-proposed |
| `Deprecated` | No longer relevant, not replaced |

## The costs rule

**"What this costs" must name something real.** An ADR whose consequences are entirely positive did not record a decision — it recorded a preference, and it will not survive contact with the person who later hits the cost and finds no warning.

If you cannot name a cost, you have either not understood the alternatives or not made a real choice. Stop and reconsider rather than writing a one-sided ADR.

Costs are concrete. Not "adds some complexity" but "four columns and a bridge table where one enum would do, and every filter UI must expose four controls instead of one."

## Alternatives

At least one, and it must be an alternative someone would actually have chosen. "Do nothing" counts only when doing nothing was genuinely viable.

Each alternative names its **specific** failure. "Less flexible" is not a reason. "A single enum cannot represent Goose Island 312, which is craft-style, non-independent, and mid-priced simultaneously" is a reason.

## Superseding

**Never edit the Decision or Context of an Accepted ADR.** Amending history destroys the record of what was believed and when, which is the only thing an ADR uniquely provides.

To change an accepted decision:

1. Write a new ADR with the next number
2. Its Context opens by naming the ADR it replaces and what changed — new information, a failed assumption, a shifted constraint
3. Set the old ADR's status line to `Superseded by ADR-NNNN`. Change nothing else in it
4. Update the index in `docs/taxonomy-decisions.md`

Correcting a typo is fine. Changing what the decision says is not.

## When an ADR is required

Write one when the decision is **expensive to reverse** or **non-obvious to a competent newcomer**:

- Schema grain, key strategy, SCD type
- Adopting or rejecting a Tier 3 data source
- A technology choice with a real alternative
- Anything that trades one success metric against another
- A decision that will look wrong without its context

Do not write one for library versions, naming within an existing convention, or anything settled by CLAUDE.md. Routine choices in an ADR tree make the real ones harder to find.

## Length

One to two pages. An ADR nobody rereads has failed at its only job. Push detail to `docs/architecture.md` and reference it.