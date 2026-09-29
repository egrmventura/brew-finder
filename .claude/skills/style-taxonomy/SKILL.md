---
name: style-taxonomy
description: Beer style classification — the TTB base layer, the keyword-to-facet map seed, the facet attribute model, and how to add or query a style. Use when working on dim_style, bridge_style_attribute, the style_keyword_map seed, style seeding, style search, or any filter that resolves a category like "Belgian beers" or "pale lagers".
allowed-tools: Read, Write, Edit, Grep, Glob
---

# Style taxonomy

Styles use one base layer, a keyword map, and a facet bridge. **No BJCP content is used anywhere:** no text, codes, style names, vital statistics, or attribute tags (ADR-0002). BJCP is licensed for non-commercial use only, and this repo is MIT-licensed, so BJCP-derived files committed here would be offered under terms we can't grant.

## The two layers

| Layer | Source | Role |
|---|---|---|
| **Base** | TTB class and type designations, 27 CFR Part 7 | Required. US federal, unrestricted. Every style has one |
| **Keyword map** | `pipeline/dbt/seeds/style_keyword_map.csv`, maintained by hand in this repo | Assigns facets from words in beer names, COLA fanciful names, and TTB class/type text |

`ttb_class_type` is `not null` on `dim_style`.

## The keyword map

A dbt seed at `pipeline/dbt/seeds/style_keyword_map.csv` with these columns:

| Column | Meaning |
|---|---|
| `keyword` | A normalized word or phrase, lowercase with punctuation stripped, e.g. `pale ale` or `gose` |
| `attribute_group` | A facet group from the controlled vocabulary below, or `exclude` for exclusion rows |
| `attribute_code` | A value from that group, or the exclusion reason for exclusion rows |
| `match_type` | `facet` assigns the facet. `exclude` routes the product out of beer styles (rule 2) |
| `priority` | An integer tie-breaker between keywords of equal length. Higher wins. It never overrides length (rule 1) |

A keyword with several facets gets one row per facet, and every row for the same keyword carries the same `match_type` and `priority`. The rows below only illustrate the format. They are not seed content:

```csv
keyword,attribute_group,attribute_code,match_type,priority
pale ale,color,pale,facet,0
non-alcoholic,exclude,non-alcoholic,exclude,0
```

Real rows are added by reviewed change against the vocabulary below.

The map lives only in the seed. **Never hardcode keywords in application code or SQL.** A keyword that isn't in the seed doesn't exist.

### Matching

Match against normalized text on **whole tokens and whole phrases, never substrings.** `ale` must not fire inside `pale`, and `gose` must not fire inside `mongoose`.

### Rule 1 — The longest phrase matches first

Candidate keywords are applied in order of token count (descending), then character length (descending), then `priority` (descending). A matched phrase **consumes** its tokens, and shorter keywords can only match tokens that are still unconsumed.

So in "Hazy Pale Ale", `pale ale` matches and consumes both tokens, and `pale` alone never fires. Without consumption, "pale ale" would pick up every facet mapped to `pale` as well, and the two sets can disagree.

### Rule 2 — Exclusions route products out of beer styles

Rows with `match_type = exclude` cover **non-alcoholic**, **seltzer**, and **cider**. Their `attribute_group` is `exclude`, and their `attribute_code` is one of `non-alcoholic`, `seltzer`, or `cider`.

- **Exclusions run before any facet matching.** One exclusion match routes the product out, whatever else matches. "Non-alcoholic IPA" is excluded, not classified as an IPA.
- **An excluded product gets no style facets.** It records which exclusion routed it out, so the routing can be audited.
- **`exclude` is a routing marker, not a facet group.** It never appears in `bridge_style_attribute` and isn't part of the controlled vocabulary. Adding a new exclusion reason is a reviewed change to this skill.

### Rule 3 — Every product with zero matches is logged, and that log is the seed's to-do list

A product that matches no keywords, and no exclusion, keeps its TTB class/type and nothing else. **Log every such product; never drop one silently.** Use a dbt model named per `dbt-conventions`, e.g. `int_beers_missing_style_keywords`.

Each log row carries:
- the product's natural key
- the normalized text that was matched against
- its TTB class/type
- when it was first seen

Working the log means one of three things for each row:
1. **Add a keyword.** Use this when the text contains a style word the seed is missing.
2. **Add an exclusion.** Use this when the product isn't beer.
3. **Assign facets by hand.** Use this when the name carries no style word at all, e.g. Heady Topper. This is the cost ADR-0002 accepted.

The log's row count is a coverage measure. Report it whenever the seed changes.

### Fixtures

Every change to the seed runs against fixtures with known-correct expected facets:
- a longest-match case (`pale ale` vs `pale`)
- a substring trap (`ale` inside `pale`)
- one case per exclusion reason
- a zero-match case that must appear in the log

Ambiguous words such as `pale`, `wit`, `session`, and `imperial` each get a fixture showing the intended reading.

## The facet model

Styles do not live in a single tree. A style carries many attributes across independent groups, joined through `bridge_style_attribute`.

```sql
-- Grain: one row per style per attribute.
bridge_style_attribute (style_sk, attribute_group, attribute_code)
```

### Controlled vocabulary

The vocabulary is project-authored (ADR-0002). Only these values are allowed. Adding a **value** requires review; adding a **group** requires an ADR.

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
3. Add the seed keywords that should route products to it, with fixtures
4. Leave vital-statistics ranges (`og`, `fg`, `ibu`, `srm`, `abv` min/max) `null` unless they come from a registered, license-clean source. Never from BJCP, and never interpolated (ADR-0002)
5. Confirm at least one existing beer classifies to the style, or record why the style is being seeded empty

## Style resolution from free text

When a user types "cheap IPA" or "belgian tripel," resolve to facets, not to a style name match:

1. Normalize and strip qualifiers that map to other axes — "cheap" is a price band, not a style
2. Match remaining tokens against style names, then against alias entries, then against facet codes
3. Return a facet set, not a single style, unless the match is exact

Price, availability, and brewer attributes are **not** style facets. If a term resolves to one of those, route it to that axis. A style facet describes the liquid.

## Never

- Any BJCP content in the repo or database: codes, style names, guideline prose, commercial examples, vital statistics, or attribute tags (ADR-0002)
- Substring matching in the keyword map
- A shorter keyword matching tokens already consumed by a longer one
- An `exclude` row writing to `bridge_style_attribute`
- A zero-match product dropped instead of logged
- Keywords hardcoded outside the seed
