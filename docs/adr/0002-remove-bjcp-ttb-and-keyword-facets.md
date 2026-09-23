# ADR-0002 — Remove BJCP; styles from TTB class/type plus a keyword-to-facet map

**Status:** Accepted
**Date:** 2026-09-22

## Context

No earlier ADR records the BJCP decision. The design this replaces lives in CLAUDE.md hard constraint 5, in `PLAN.md` (§2.1, the `dim_style` spec in §5, Phase 0 in §7, and the first actions in §10), in the `style-taxonomy` skill, and in the README's "Data and licensing" section. Together they place BJCP codes in a nullable, detachable `bjcp_code` column loaded from the parsed BJCP 2021 JSON, "so the taxonomy still works if permission is denied."

That design assumed the only risk was commercial use *by us*. Two facts break the assumption:

1. **The license terms don't match.** BJCP content is licensed for non-commercial use only. This repository is MIT-licensed, and MIT grants everyone the right to use the software commercially. Seed data, fixtures, or a crosswalk derived from BJCP and committed here would be offered under terms we have no right to grant. Our own non-commercial operation (ADR-0001) doesn't cure this, because self-hosters inherit the files.
2. **A detachable overlay still ships.** Nullability protects queries, not the licensing position. The detachability test proves the app keeps working once `bjcp_code` is nulled, but by then the codes are already in the repository.

## Decision

No BJCP content enters the repository or any database this project builds: no codes, style names, vital-statistics tables, attribute tags, parsed-guideline files, or crosswalk columns. `bjcp_code` and `bjcp_style_name` are removed from the `dim_style` design. `PLAN.md` open question 1, the BJCP permission request, closes as not needed.

Styles are classified in two layers:

1. **TTB class/type** (27 CFR Part 7) is the required base, unchanged: federal, unrestricted, and `not null`.
2. **A manually maintained keyword-to-facet map**, versioned in the repo, matches tokens in beer names, COLA fanciful names, and TTB class/type text (e.g. "IPA", "pilsner", "saison", "gose") to codes in `bridge_style_attribute`. The facet vocabulary is project-authored (see the `style-taxonomy` skill) and stays as it is. Adding a keyword is a reviewed change. Adding a facet group still requires an ADR.

## Consequences

### What this enables

- The style layer carries no license restriction and is compatible with MIT and with any downstream use.
- There is nothing left to detach, so the detachability test and the constraint-audit check that runs it can be retired.
- The facet query path is unchanged: "Belgian beers" still resolves to `region:belgian`.

### What this costs

- **Classification is only as good as the name.** Keywords fire only on words that appear. A beer named without a style word (e.g. Heady Topper) gets its TTB class/type alone, such as "ale", and drops out of every finer facet query. The only way back is a per-beer manual facet assignment, and that labor scales with catalog size.
- **Vital-statistics ranges are gone.** The per-style `og`/`fg`/`ibu`/`srm`/`abv` min-max values were to come from BJCP data. Without them we can't infer a style from a label's stated ABV or IBU (`PLAN.md` §2.7). The columns stay `null` unless a license-clean source is registered.
- **Granularity drops.** BJCP distinguishes 100+ styles (`PLAN.md` §2.1). TTB plus keywords resolves mostly to family- and region-level facets. "West Coast vs. New England IPA" works only where the name says so.
- **Keyword collisions need hand maintenance.** "Pale" in "Pale Ale" is a style word; "Pale" in a fanciful name may not be. "Wit", "session", and "imperial" carry similar ambiguity. The map needs negative rules and test fixtures, and nobody else maintains it.
- **Contradicting docs are live until corrected.** Every document listed under Context stays wrong until it is updated. Until then, an agent reading CLAUDE.md constraint 5 will reintroduce the column.

## Alternatives considered

### Keep the detachable overlay and rely on non-commercial operation

The problem is distribution, not operation. MIT-licensed files containing non-commercial content misstate the terms to every downstream user, whatever we do with them ourselves.

### Keep BJCP out of the repo, but let self-hosters load it themselves

We would still ship the loader, the nullable column, and the crosswalk logic. That keeps the overlay's full schema complexity alive to serve an optional import whose licensing each self-hoster has to resolve alone, and it leaves two classification behaviors to test.

### Request BJCP written permission

Permission would be granted to this project. It would not pass through an MIT license to every downstream user, so it doesn't solve the distribution problem, and asking reopens the commercial-terms conversation that ADR-0001 closes.

### Brewers Association style guidelines instead

These are also copyrighted (`PLAN.md` §2.2), so they have the same distribution problem.
