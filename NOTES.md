# Notes

**2026-09-17** — Skill and agent description review, wave 0. Four skills and two agents are in place; the concerns below were found while triaging three sample requests against them. All four skills matched exactly one skill each, so nothing is broken today. These are description-level problems that get worse as more skills are added.

---

## 1. `handoff-protocol` mixes reading and writing

**Where:** `.claude/skills/handoff-protocol/SKILL.md`, the `description` line.

The description covers two opposite jobs — writing a new handoff note, and reading the latest one to find out where work stands. Both trigger phrases sit in the same sentence.

**What may happen:** A question like "what did we change today" loads the skill and it starts authoring a file in `docs/handoffs/`, when the ask was a verbal recap. The result is a stray note in a directory whose own rule is that notes are never edited after the fact — so a note written by mistake stays in the log permanently.

**Fix shape:** Separate the read trigger from the write trigger, or state plainly in the description that this skill always writes a file.

---

## 2. `adr-authoring` triggers on lookups it cannot serve

**Where:** `.claude/skills/adr-authoring/SKILL.md`, the clause "or when asked why the project does something a particular way."

That is a lookup trigger on an authoring skill. The body of the skill is about file numbering and superseding — nothing about answering a question from existing records.

**What may happen:** "Why do we use MapLibre instead of Mapbox?" loads a skill full of instructions for creating a new ADR. Best case, the instructions are ignored as irrelevant. Worse case, a new ADR gets written that duplicates or contradicts one already in `docs/adr/`.

**Fix shape:** Drop the lookup clause, or give the skill an explicit read path for answering from existing ADRs.

---

## 3. Skill and agent ownership is undeclared

**Where:** `.claude/skills/dimensional-grain/SKILL.md` vs `.claude/agents/data-modeler.md`; `.claude/skills/handoff-protocol/SKILL.md` vs `.claude/agents/doc-scribe.md`.

Both pairs claim the same territory. `dimensional-grain` and `data-modeler` each cover schema changes, migrations, and column additions. `handoff-protocol` and `doc-scribe` each cover session handoff notes. No description says which one runs first, or whether the agent is meant to load the skill.

**What may happen:** Routing becomes a judgment call made fresh each session, so the same request gets handled differently depending on the session. Worse, work gets done twice — an agent spawned for a schema change that the skill would have handled inline, which costs a cold-start context rebuild for no gain.

**Fix shape:** State the precedence in each description. The likely rule: skill for inline work, agent only when the task needs its own context.

---

## 4. `dimensional-grain` and `style-taxonomy` overlap on `dim_style`

**Where:** `.claude/skills/dimensional-grain/SKILL.md` claims any `dim_` table change; `.claude/skills/style-taxonomy/SKILL.md` claims `dim_style` specifically.

**What may happen:** "Add a column to `dim_style`" matches both. Today loading both in sequence is the right answer, so the overlap is harmless. With nine more skills the same pattern repeats across every table-specific skill, and nothing in any description says whether the specific one supersedes the general one or defers to it on grain and key questions.

**Fix shape:** Have the narrower skill say explicitly that it defers to `dimensional-grain` on grain, keys, and forbidden column names, and owns only the taxonomy layering.

---

## Tagged documents

Files carrying one or more of the concerns above:

- `.claude/skills/handoff-protocol/SKILL.md` — concerns 1, 3
- `.claude/skills/adr-authoring/SKILL.md` — concern 2
- `.claude/skills/dimensional-grain/SKILL.md` — concerns 3, 4
- `.claude/skills/style-taxonomy/SKILL.md` — concern 4
- `.claude/agents/data-modeler.md` — concern 3
- `.claude/agents/doc-scribe.md` — concern 3

All paths are relative to the repository root, `brew-finder/`.
