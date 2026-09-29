---
description: Break a PLAN.md §7 phase into file-level tasks, with owners, gates, and verification. Stops before writing any code.
argument-hint: <phase: 0 | 1 | 2 | 2.5 | 3 | 4>
allowed-tools: Read, Grep, Glob, Bash(git status:*), Bash(git log:*), Bash(ls:*)
model: opus
---

Plan phase **$ARGUMENTS**. Produce a plan only: write no code, create no files, and edit nothing.

## 1. Validate the phase

The current phases in `PLAN.md` §7 are **0, 1, 2, 2.5, 3, 4**.

- **5 or 6:** refuse. Both are cut; see "Cut phases" in §7.
- **Any other value, or none given:** list the valid phases and stop.
- **§7 differs from this list:** trust `PLAN.md`, and flag the mismatch in the output.

## 2. Load context

Read these in order, and read the phase's own text from `PLAN.md`. Don't plan from memory.

1. `CLAUDE.md`
2. The most recent note in `docs/handoffs/`: the newest `YYYY-MM-DD-*.md` file. Ignore `TEMPLATE.md`, which sorts last by name. If no note exists, say so.
3. `PLAN.md` §7: this phase's section and the phases immediately before and after it
4. `PLAN.md` §0.3: the success criteria this phase is measured against
5. Every ADR in `docs/adr/` that the phase text cites
6. `docs/architecture.md`. While it is a stub, CLAUDE.md makes `PLAN.md` §5 the schema source. Say which one you used.
7. `docs/data-sources.md`: find the entry for every source this phase touches

## 3. Check the gates before breaking anything down

- **Skill gate (CLAUDE.md):** work on identity resolution and in `packages/scoring` cannot start until the `entity-resolution` and `scoring-eval-protocol` skills exist in `.claude/skills/`.
  - Phases 2 (alias table, fuzzy resolver), 2.5 (extraction resolves names), and 3 (scoring) include gated work.
  - If a required skill is missing, list the gated tasks as **BLOCKED — missing skill `<name>`** and do not break them down.
- **Source gate:** every source the phase uses must have an entry in `docs/data-sources.md`. An unregistered source makes its registration the first task, owned by `source-scout`. Nothing that depends on that source may be scheduled ahead of it.
- **Out-of-repo work:** Phase 2.5 runs mainly in the separate public dataset repository (ADR-0005). Mark every task that lives outside this repo.

## 4. Output

**Summary.** One line on what the phase delivers, quoted from its "Deliverable" in §7.

**Tasks.** A numbered list. Each task gives:
- the files it creates or changes, as exact paths. Paths come from `PLAN.md` §5 and §9 and the skills, not invented ones.
- the owner agent: `data-modeler`, `pipeline-engineer`, `geo-engineer`, `source-scout`, or `doc-scribe`
- its dependencies, by task number
- its gate, where one applies:
  - `/model-check` before any migration
  - `/new-source` for any fetcher
  - tests before implementation for scoring, identity resolution, and release extraction (CLAUDE.md)
- how completion is verified: the exact command, or "manual check" plus what is checked

**Metrics.** The §0.3 rows this phase moves, and how the plan measures each one.

**Open.** Unresolved questions the phase depends on. Include every value the plan needs but can't find in the repo, such as license class codes, endpoints, or the dataset repo's name. **Never fill one in.**

**Blocked.** Every gated or unregistered item from step 3.

End with: "Plan only — no code written. Review and edit before implementation."
