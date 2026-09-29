<!--
Handoff template. Copy it to docs/handoffs/YYYY-MM-DD-short-slug.md; /handoff does this for you.
Never edit this file to record a session, and never edit a prior handoff. Corrections go in the next note.
"Most recent note" means the newest YYYY-MM-DD-*.md file. This template doesn't count.
Rules: the handoff-protocol skill. Keep the note under one page. Replace every [bracketed] field.
-->

# YYYY-MM-DD — [session title]

## Scope

[One or two sentences: what this session set out to do.]

## Changed

<!-- Build this from `git status` and `git diff --stat`, never from memory. -->
- `path/to/file` — [what changed and why, one line]

## Verified

<!-- Every command in the verification gate appears here, per CLAUDE.md § Commands. "not run" is required, never omitted. -->
| Command | Result |
| --- | --- |
| `pnpm lint:docs` | [pass / fail / **not run** — reason] |
| `pnpm typecheck` | [pass / fail / **not run** — reason] |
| `pnpm lint` | [pass / fail / **not run** — reason] |
| `pnpm test` | [pass / fail / **not run** — reason] |

## Decisions

- [Decision made this session. Does it warrant an ADR, and was one written? Give the ADR-NNNN number.]

## Open

- [Unresolved question, and what it blocks.]
- [Every guessed value: version, URL, threshold, date, or identifier, with its file:line.]

## Next

- [One concrete first action for the next session, not a topic.]
