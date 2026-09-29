---
name: constraint-audit
description: The review checklist for any change — forbidden columns, grain declarations, SCD2 integrity, source registration, model ceiling, no BJCP content, non-goal scope, and verification honesty. Use when reviewing a diff, before a commit, during QA, or when asked whether a change is ready to merge.
allowed-tools: Read, Grep, Glob, Bash
---

# Constraint audit

Run against **the diff**, not the whole repository. Every item is reported individually with its result and the evidence.

## The reporting rule

**Never summarize.** Do not write "all checks passed," "audit clean," or "no issues found."

Report each item as a line with its result and the command output or file reference that supports it. A summarized checklist is indistinguishable from an unrun one, and the reader has no way to tell which they received.

```
1. Forbidden columns — PASS. `git diff | grep -iE '...'` returned no matches.
2. Grain declared — FAIL. fact_price_observation has no Grain: comment.
3. SCD2 integrity — N/A. No dimension changed in this diff.
```

`N/A` is a valid result and requires the same justification as a pass.

## The checklist

### 1. Forbidden columns

```bash
git diff | grep -iE '\b(quality_tier|quality_level|beer_quality|craft_level|is_craft|is_premium|in_stock|is_available|stock_count|quantity_on_hand|has_beer)\b'
```

Any match is a failure. Name which constraint it violates — collapsed classification axes, or asserted availability.

Also check by hand for synonyms the grep misses. A column named `availability boolean` or `beer_grade` violates the same rule with different words. The grep is a floor, not a ceiling.

### 2. Price placement

```bash
git diff -- '*dim_beer*' | grep -iE 'price'
```

Price is a property of a store's shelf on a date. Any price column on `dim_beer` is a failure.

### 3. Grain declared

Every new or modified fact or dimension model has a `Grain:` comment, and the identical sentence appears in `docs/architecture.md`. Differing wording between the two is a failure — they drift into contradiction.

### 4. SCD2 integrity

If any SCD2 dimension changed: the four required tests are present, and no fact joins on `is_current`.

```bash
git diff | grep -nE 'is_current' 
```

Any `is_current` in a fact-to-dimension join condition is a failure.

### 5. Surrogate key exposure

```bash
git diff -- 'packages/types/**' | grep -iE '_sk\b'
```

Surrogate keys are internal. Any `_sk` in a public type is a failure.

### 6. Source registration

Every new fetcher, scraper, or API client has a corresponding entry in `docs/data-sources.md` with a `last_verified` date. Every new `sources.yml` entry likewise.

A Tier 3 source additionally requires an accepted ADR. Check `docs/adr/` for it — a referenced ADR that does not exist is a failure.

### 7. dbt layering

```bash
git diff -- 'pipeline/dbt/models/staging/**' | grep -E "ref\("
```

Staging referencing a model is a failure. Also check: intermediate referencing a mart, and any hardcoded schema-qualified table name in place of `ref()` or `source()`.

### 8. Spatial queries

Any new spatial query: `ST_DWithin` in `WHERE` rather than `ST_Distance`, a GiST index on the geography column, and an `EXPLAIN` plan showing an index scan. **An unread EXPLAIN is a failure**, not a pending item.

Hours stored in local time with an IANA timezone, never UTC, never a fixed offset.

### 9. No BJCP content

No BJCP content may enter the repo: codes, style names, guideline prose, commercial examples, vital statistics, or attribute tags (ADR-0002). Check only **added** lines. A diff that removes BJCP references matches on `-` lines, and removal is not a failure.

```bash
git diff | grep -E '^\+' | grep -inE 'bjcp'
git diff | grep -E '^\+' | grep -inE 'overall impression|commercial examples|characteristic ingredients|style comparison|vital statistics|mouthfeel'
```

The second grep looks for the section headings of guideline text. Pasted style descriptions tend to carry them.

**Judge and report every match.**
- **A reference is a PASS**, with the line cited. A reference names BJCP in order to exclude it, as ADRs, CLAUDE.md, PLAN.md, and skills do.
- **Content is a FAIL.** Content is anything a BJCP document supplied.

**Then check by hand, because the greps are a floor.**
- **Style prose.** Any added style description in a seed, fixture, or model is a failure unless the diff shows it was written here. Beyond a short label, it must not read like guideline text.
- **Vital statistics.** Any added `og`/`fg`/`ibu`/`srm`/`abv` range on a style is a failure unless it cites a registered, license-clean source in `docs/data-sources.md`.

### 10. Model ceiling

```bash
grep -rE '^model:' .claude/agents/ .claude/skills/ .claude/commands/
```

Any value above `opus`, or the `fable` or `best` alias, is a failure.

### 11. Non-goal scope

Scan the diff for work that belongs to a non-goal in `PLAN.md` §0.4:

- Cart, checkout, delivery, reservation, or any transaction affordance
- Rating, score, review, follower, or check-in feed as user-facing content
- Any surface presenting availability as inventory rather than confidence

The last one is the easiest to miss in UI copy. "In stock at 3 stores" violates it as surely as a boolean column.

### 12. Verification honesty

Every claim that something was tested, validated, or verified corresponds to a command that was actually run and observed. Check the handoff's Verified table against reality.

A change described as validated with no executed command is a failure regardless of whether the code is correct.

### 13. Placeholders

```bash
git diff | grep -nE '[0-9]+\.[0-9]+\.[0-9]|TODO|FIXME|XXX|placeholder|example\.com'
```

Any invented version, URL, threshold, or identifier is listed with its file and line, and must appear under **Open** in the handoff. A placeholder that survives the session boundary becomes indistinguishable from a verified value.

## Output

End with a count: items passed, failed, not applicable. Then list every failure with file, line, and the constraint violated.

**Do not fix what you find.** Report it. The agent that owns the scope makes the change — a reviewer that edits is no longer a reviewer, and the separation is the only thing making the audit independent.