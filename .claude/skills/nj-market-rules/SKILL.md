---
name: nj-market-rules
description: New Jersey alcohol retail licensing structure and its consequences for outlet modeling — the two-license cap, the population ratio on retail distribution licenses, dry municipalities, municipal hour ordinances, and the NJ ABC licensee registry. Use when working on dim_outlet, outlet archetypes, the pilot market, or any scoring weight that depends on store type.
allowed-tools: Read, Write, Edit, Grep, Glob, WebFetch, WebSearch
---

# New Jersey market rules

New Jersey is the pilot market, chosen because its license structure pre-sorts outlets into clean archetypes. Understanding why is necessary to model `outlet_type` correctly and to avoid generalizing weights that will not transfer.

## The structure

Three properties drive everything downstream:

**Corporate entities are limited to two retail distribution licenses statewide.** A chain cannot hold a license per store. This is why supermarkets and convenience stores in New Jersey almost entirely do not sell beer, and why the handful of exceptions are chains that hold exactly two.

**Municipalities may issue only one plenary retail distribution license per 7,500 residents.** Licenses are scarce, trade at high prices on the secondary market, and cluster in older municipalities where they were issued before the cap bound.

**Roughly 30 municipalities are dry**, prohibiting retail alcohol sale entirely.

## Why this makes New Jersey a good pilot

The `outlet_archetype_affinity` term in the scoring function separates "dedicated bottle shop" from "gas station" from "supermarket." In most states that is a continuum with heavy overlap — a Pennsylvania beer distributor, a California grocery store, and a Texas gas station all sell beer with very different assortments and no structural marker distinguishing them.

In New Jersey the license structure has already done the sorting. Off-premise beer retail concentrates in independent liquor stores, so the archetype signal arrives with far less noise than it would elsewhere.

## The transfer warning

**Do not generalize outlet archetype weights out of New Jersey without re-fitting.**

The license structure that makes the signal clean here is exactly what makes it non-transferable. A weight fitted on a market where supermarkets cannot sell beer will be badly wrong in a market where they are the dominant channel. Record this in the ADR for any weight fitted on New Jersey data.

## Modeling consequences

| Fact | Consequence |
|---|---|
| Chains largely absent from beer retail | `outlet_type` distribution skews hard to independent liquor stores. Do not treat a sparse `supermarket` bucket as a data quality problem — it is the market |
| Licenses are scarce and valuable | Outlet count per municipality is capped by population, so radius searches in low-population areas legitimately return few results. Do not pad them |
| ~30 dry municipalities | Modeled as geographic exclusions — see `geo-query-patterns`. A confident result in a dry town is a correctness failure |
| Municipal hour ordinances vary | Hours must be sourced per outlet. A statewide hours rule will be wrong in an unknown number of municipalities, and "open now" is a stated success metric |

## NJ ABC licensee registry

The New Jersey Division of Alcoholic Beverage Control publishes licensee data — who holds which license class, in which municipality.

This is unusually good for `dim_outlet`. It is an authoritative list of exactly who may legally sell beer, which most states do not publish as cleanly. It also gives a cross-check: an outlet appearing in Google Places but not in the licensee registry is either miscategorized or closed.

Before using it: register it in `docs/data-sources.md` per the `source-registration` skill, confirm the export format and update cadence, and record whether it distinguishes consumption from distribution licenses.

## Verify before encoding

License class codes and their numeric designations are **not recorded in this skill deliberately.** Encode them only after reading the current NJ ABC documentation directly, and record the verification date alongside the mapping.

The distinction that matters to us is consumption (on-premise — bars, restaurants) versus distribution (off-premise, packaged goods to take home). We care about distribution. A licensee list filtered to the wrong class would populate `dim_outlet` with bars.

The two-license cap and the one-per-7,500 ratio are stable features of New Jersey law, but alcohol licensing changes. Treat this skill's contents as re-verifiable, and update it with a date when you check.

## Never

- Encode a license class code from memory or from this file. Read the current ABC documentation
- Fit an archetype weight on New Jersey data and apply it to another market without re-fitting
- Apply a statewide hours rule in place of per-outlet hours
- Treat a low outlet count in a small municipality as missing data
- Use the licensee registry before registering it as a source