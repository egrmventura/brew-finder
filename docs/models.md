# Model routing policy

Which Claude model does which work in this repository, and the limits on that choice. `CLAUDE.md` § Model policy is the binding statement; this file expands it. No ADR records the model policy. It is operating configuration, not a product decision.

## Ceiling

**The ceiling is the Opus tier: whatever the `opus` alias resolves to.** No agent, command, or skill may name a model above `opus`. It is stated as a tier, not a version, because the allowlist is written in aliases and `opus` moves with releases. It resolved to Opus 5.5 on 2026-09-23, which a fixed "Opus 5" contradicted.

**`fable` and `best` are prohibited.** `best` resolves to a Fable model where one is available, which silently exceeds the ceiling. Naming either one in frontmatter, settings, or a `/model` call violates this policy.

**Enforcement:** `.claude/settings.json` sets `availableModels: ["opus", "sonnet", "haiku"]` with `enforceAvailableModels: true`, so the session can only select those three aliases.

## Session default

**`opusplan`**: Opus while in plan mode, Sonnet while executing. Planning is where a wrong abstraction is cheap to catch, so it gets the stronger model. Execution against a reviewed plan doesn't need it.

## Routing by work type

| Work type | Model | Owner | Why |
| --- | --- | --- | --- |
| Schema design: grain, keys, SCD2, migrations | `opus` | `data-modeler` | The most expensive decisions to reverse once data lands |
| Merge review: `/code-review` plus `constraint-audit` | `opus` | `qa-reviewer` | Independent judgment; a missed finding ships |
| Phase planning (`/plan-phase`) and ADR authoring | `opus` | — | Decisions and their costs are set here |
| Schema pre-checks (`/model-check`) | `opus` | — | The same judgment as schema design, applied before a migration |
| Scoring and identity-resolution implementation, and model evaluation (`/scoring-eval`) | `opus` | — | CLAUDE.md names these as where generated code "looks correct and is subtly wrong" |
| dbt models and ingest (`/new-source` scaffolds) | `sonnet` | `pipeline-engineer` | Well-trodden work, governed by `dbt-conventions` and review |
| Spatial queries and hours logic | `sonnet` | `geo-engineer` | Governed by `geo-query-patterns`; EXPLAIN plans catch errors |
| Source research and registration | `sonnet` | `source-scout` | Reading terms and fetching samples; tiering is reviewed |
| Handoffs, glossary, changelog (`/handoff`) | `haiku` | `doc-scribe` | Records work already done, under strict honesty rules |

When a task spans two rows, it takes the higher model.

## Subagent pinning

These match `.claude/agents/*.md` as they exist. If an agent file changes, update this table in the same change.

| Agent | `model` | `effort` | Tools | Owns |
| --- | --- | --- | --- | --- |
| `data-modeler` | `opus` | `xhigh` | Read, Write, Edit, Grep, Glob, Bash | Marts, snapshots, migrations, the schema sections of `docs/architecture.md` |
| `qa-reviewer` | `opus` | not pinned | Read, Grep, Glob, Bash | Review only. It has no write tools, by design |
| `pipeline-engineer` | `sonnet` | not pinned | Read, Write, Edit, Grep, Glob, Bash | Staging, intermediate, ingest, and pipeline tests; marts to an approved spec |
| `geo-engineer` | `sonnet` | not pinned | Read, Write, Edit, Grep, Glob, Bash | Spatial queries, hours, dry-municipality exclusion |
| `source-scout` | `sonnet` | not pinned | Read, Grep, Glob, WebFetch, WebSearch, Write, Edit | `docs/data-sources.md` and Tier 3 ADR drafts. Never code |
| `doc-scribe` | `haiku` | not pinned | Read, Write, Edit, Grep, Glob, Bash | `docs/handoffs/`, `CHANGELOG.md`, `docs/glossary.md` |

## Effort policy

**Current pins.** `data-modeler` is the only agent that pins an effort level (`xhigh`). Every other agent, and every command, runs at the session's effort.

**Rules:**

1. **Raise effort before raising the model.** Where the ceiling blocks a stronger model, more effort on `opus` is the permitted lever.
2. **Pin effort only where a wrong answer is expensive to reverse,** as schema is for `data-modeler`. Record every pin in the table above.
3. **Effort never substitutes for verification.** A high-effort answer that was never run is still unverified. The honesty rules in CLAUDE.md and the `handoff-protocol` skill apply at every level.

## Open

- **`opusplan` may not be selectable.** It isn't listed in `availableModels`, and whether `enforceAvailableModels` blocks it has not been checked. `settings.json` also doesn't set a default model, so the `opusplan` default above is stated here but not enforced.
