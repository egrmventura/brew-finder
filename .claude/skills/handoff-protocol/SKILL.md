---
name: handoff-protocol
description: Writing session handoff notes in docs/handoffs/. Use at the end of a working session, when running /handoff, when asked to summarize what changed, or when picking up work and needing to know the current state.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Handoff notes

`docs/handoffs/` is the only record of **current state**. `PLAN.md` describes intent and `docs/adr/` records decisions; neither tracks progress. A session that starts by reading the latest handoff should need nothing else to resume.

`docs/handoffs/YYYY-MM-DD-short-slug.md`. Multiple notes per day are fine — distinguish by slug. **Never edit a prior handoff.** They are a log, not a document. Corrections go in the next note.

## Structure

```markdown
# 2026-09-16 — Phase 1 outlet ingest

## Scope
[One or two sentences: what this session set out to do.]

## Changed
- `path/to/file` — what changed and why, one line

## Verified
| Command | Result |
|---|---|
| `pnpm install` | pass |
| `pnpm typecheck` | pass |
| `pnpm test` | **not run** — no tests exist in this package yet |
| `dbt test` | **not run** — pnpm unavailable in this environment |

## Decisions
- [Decision made this session. If it warrants an ADR, say so and whether one was written.]

## Open
- [Unresolved question, with what it blocks.]

## Next
- [Concrete first action for the next session.]
```

## The Verified section

This section is mandatory and is the reason the format exists.

**State exactly what was executed and what was not.** `not run` is a valid, required entry — never an omission. A command that was not run must appear in the table with `not run` and the reason, not be quietly absent.

Never write "verified," "validated," "working," or "ready" about anything you did not execute and observe. If the environment lacked the tool, say that. If there was nothing to test, say that.

A handoff claiming a passing state that was never observed is worse than no handoff. It converts an unknown into a false known, and the next session builds on it.

### Placeholder disclosure

Any value written into a file that was guessed rather than derived — a version number, a URL, a threshold, a date, an identifier — is listed under **Open**, explicitly, with the file and line.

A placeholder that survives the session boundary becomes indistinguishable from a verified value. Disclosing it in the handoff is the last chance to catch it.

## What to leave out

- Narration of the work ("first I looked at, then I decided")
- Full diffs — `git log` and `git diff` have them
- Restatements of `PLAN.md` or `CLAUDE.md`
- Praise for the work or the session
- Anything you would not want to read at the start of a session three weeks later

Target under one page. A handoff long enough to skim past has failed.

## Writing one

1. Run `git status` and `git diff --stat` to enumerate actual changes — do not write the Changed section from memory
2. List every command in the session's verification gate. Mark each pass, fail, or not run with a reason
3. Record decisions. If any warrants an ADR, say whether one was written
4. Scan for placeholders — grep the diff for invented version numbers, URLs, thresholds, and dates — and list them under Open
5. Write Next as a concrete first action, not a topic. "Register NJ ABC licensee data in docs/data-sources.md and verify the export format," not "continue outlet work"

## Reading one

Read the most recent note before starting work. Treat **Open** as live and **Next** as a proposal, not an instruction — the priority may have moved since.

Anything in **Verified** marked `not run` is unverified state. Verify it before building on it.