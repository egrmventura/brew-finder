---
name: style-taxonomy
description: Beer style classification — the TTB base layer, the detachable BJCP overlay, the facet attribute model, and how to add or query a style. Use when working on dim_style, bridge_style_attribute, style seeding, style search, or any filter that resolves a category like "Belgian beers" or "pale lagers".
allowed-tools: Read, Write, Edit, Grep, Glob
---

# Style taxonomy

Two layers and a facet bridge. The layering exists for a licensing reason, and collapsing it creates a legal exposure baked into the schema rather than a refactor.

## The two layers

| Layer | Source | Status | Role |
|---|---|---|---|
| **Base** | TTB class and type designations, 27 CFR Part 7 | US federal, unrestricted | Required. Every style has one. Carries the system if the overlay is removed |
| **Overlay** | BJCP 2021 style guidelines | Copyrighted, **not licensed for commercial use** without written permission we do not have | Optional. Nullable column. Enriches, never load-bearing |

`ttb_class_type` is `not null` on `dim_style`. `bjcp_code` is nullable, has no foreign key, and is never part of any index used by a query path.

## The detachability test

Before merging any change to `dim_style` or to a query that touches it, verify:

```sql
UPDATE dim_style SET bjcp_code = NULL, bjcp_style_name = NULL;
```

**After running this, the application must still function completely.** Search works, filters work, every beer still classifies. Only the displayed style names get coarser.

If anything breaks, the overlay has become load-bearing and the change must be reworked. Run this against a test database as part of any style-touching change and report the result.

### Never

- `bjcp_code` as a primary key, foreign key, or part of a unique constraint
- A join that requires `bjcp_code is not null`
- Seeding `dim_style` from a BJCP-only source, leaving styles with no TTB base
- Copying BJCP guideline prose — descriptions, commercial examples, judging notes — into the repository. Numeric vital statistics ranges are facts about beer; the prose is the copyrighted work
- Deriving the facet vocabulary below by importing BJCP's own attribute tags wholesale

The facet model is *informed by* BJCP's 2021 style-attribute approach. The vocabulary here is ours.

## The facet model

Styles do not live in a single tree. A style carries many attributes across independent groups, joined through `bridge_style_attribute`.

```sql
-- Grain: one row per style per attribute.
bridge_style_attribute (style_sk, attribute_group, attribute_code)
```

### Controlled vocabulary

Only these values. Adding a **value** requires review; adding a **group** requires an ADR.

| Group | Values |
|---|---|
| `color` | `pale` · `amber` · `dark` |
| `strength` | `session` · `standard` · `elevated` · `strong` |
| `fermentation` | `top` · `bottom` · `spontaneous` · `mixed` · `any` |
| `family` | `ipa` · `lager` · `wheat` · `stout-porter` · `sour` · `belgian-ale` · `specialty` |
| `region` | `north-america` · `british-isles` · `germanic` · `belgian` · `czech` · `nordic` · `other` |
| `character` | `hoppy` · `malty` · `roasty` · `tart` · `fruity` · `spiced` · `balanced` |

A style may carry multiple values in one group. A Belgian IPA is `region:belgian` and `family:ipa` and `family:belgian-ale`. That is correct, not a conflict — it is the entire point of a facet model over a tree.

### Why this over a hierarchy

A user asking for "Belgian beers" is not naming a node in a tree. They mean a region, and the answer spans dubbels, saisons, lambics, and Belgian IPAs that also belong to the IPA family. A hierarchy forces one parent and gets it wrong for everything else.

```sql
-- Correct: a facet query
select s.* from dim_style s
join bridge_style_attribute a on a.style_sk = s.style_sk
where a.attribute_group = 'region' and a.attribute_code = 'belgian';
```

**Never hardcode a style list in application code.** If a filter cannot be expressed as a facet query, the missing facet is the bug — add the attribute, do not add an array of style names to a TypeScript file.

## Adding a style

1. Assign the TTB class/type. Required. If none fits, stop and raise it — do not invent one
2. Assign facets across every applicable group. A style with no `family` value is incomplete
3. Add the BJCP code **only if** you have it from an already-registered source. Never guess a code, never derive one by similarity
4. Populate vital statistics ranges (`og`, `fg`, `ibu`, `srm`, `abv` min/max) where known, `null` where not. Never interpolate a plausible range
5. Run the detachability test
6. Confirm at least one existing beer classifies to the style, or record why the style is being seeded empty

## Style resolution from free text

When a user types "cheap IPA" or "belgian tripel," resolve to facets, not to a style name match:

1. Normalize and strip qualifiers that map to other axes — "cheap" is a price band, not a style
2. Match remaining tokens against style names, then against alias entries, then against facet codes
3. Return a facet set, not a single style, unless the match is exact

Price, availability, and brewer attributes are **not** style facets. If a term resolves to one of those, route it to that axis. A style facet describes the liquid.