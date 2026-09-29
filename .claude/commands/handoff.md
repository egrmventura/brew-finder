---
description: Write a dated session handoff note to docs/handoffs/, per the handoff-protocol skill.
argument-hint: <short-slug>
allowed-tools: Read, Write, Grep, Glob, Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(date:*), Bash(ls:*)
model: haiku
---

Write the handoff note for this session, with slug **$ARGUMENTS**. Load the `handoff-protocol` skill and follow it, using `docs/handoffs/TEMPLATE.md` for the structure.

1. **File name.** `docs/handoffs/YYYY-MM-DD-$ARGUMENTS.md`, taking the date from `date +%F`. If that file already exists, stop and ask for a different slug.
   - **Never edit an earlier handoff.** Corrections go in this note.
   - **Never write to `TEMPLATE.md`.**
2. **Changed.** Build it from `git status` and `git diff --stat`, run now. Never write it from memory. One line per file: the path, then what changed and why.
3. **Verified.**
   - List every command in the required check as CLAUDE.md § Commands currently defines it: `pnpm lint:docs`, plus `pnpm typecheck`, `pnpm lint`, and `pnpm test`. Add `dbt` commands if the pipeline was touched. If a command isn't part of the check yet, list it as **not run** with that reason.
   - Mark each **pass**, **fail**, or **not run** with a reason. Include only commands actually run and observed this session.
   - Never write "verified", "validated", "working", or "ready" about anything not executed.
4. **Decisions.** Record each decision made this session. For each, say whether it warrants an ADR and whether one was written, with its number.
5. **Open.** List unresolved questions and what each one blocks. Then scan the diff for invented version numbers, URLs, thresholds, dates, and identifiers:

   ```bash
   git diff | grep -nE '[0-9]+\.[0-9]+\.[0-9]|TODO|FIXME|XXX|placeholder|example\.com'
   ```

   List every guessed value under Open, with its file and line.
6. **Next.** One concrete first action for the next session, not a topic.

Keep it under one page. Leave out narration, full diffs, restatements of `PLAN.md` or `CLAUDE.md`, and praise.

When the file is written, print its path. Don't commit it.
