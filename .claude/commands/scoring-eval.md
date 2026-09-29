---
description: Evaluate the availability model against a held-out observation set and report precision per confidence band. Requires the scoring-eval-protocol skill.
argument-hint: [model_version — defaults to the current one]
allowed-tools: Read, Grep, Glob, Bash(ls:*), Bash(git status:*), Bash(git log:*), Bash(pnpm:*), Bash(dbt:*)
model: opus
---

Evaluate the availability model, version **$ARGUMENTS** (or the current version if none is given).

## 1. Gate. Run this first.

Check for `.claude/skills/scoring-eval-protocol/SKILL.md`.

**If it doesn't exist, stop now.** Respond: "Blocked: the `scoring-eval-protocol` skill does not exist. CLAUDE.md requires it before any scoring work." Run nothing else.

If it exists, load it. **The skill defines the protocol:** how the held-out set is drawn, which bands and thresholds apply, and what counts as a hit. Where this command and the skill differ, the skill wins.

## 2. Constraints the protocol can't relax

- **Observations come only from `manual` and `newsletter`** (ADR-0001, ADR-0005). There are no user confirmations and no scraped or partner data.
- **The held-out set is never used to tune weights.** If you can't show that a set was held out from fitting, report the evaluation as invalid rather than running it.
- **Evaluate on New Jersey outlets only** (ADR-0003).

## 3. Run and report

Run the evaluation as the skill specifies. Report:

- **Model and data:** the `model_version`, the held-out set's date range, and its total size
- **Per-band results:** for each confidence band (`Very likely`, `Usually stocked`, `Sometimes`, `Call ahead`), its precision **with its sample size beside it**. Report no pooled precision on its own.
- **Coverage:** the count of scored beer × outlet pairs with no observation at all, since that is where the score rests only on w₁, w₂, and w₅
- **Commands:** every command actually run, with its result. Anything specified but not run is marked `not run` with the reason.

Compare against the previous evaluation only if one is recorded in `docs/handoffs/`. **Never fill in a baseline number.**
