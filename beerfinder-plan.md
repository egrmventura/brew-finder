# BeerFinder — Project Plan

> **Insertion note:** these are sections 0.1–0.6. They go at the top of `beerfinder-plan.md`, immediately before the existing `## 1. The modeling problem hiding in the brief`. Replace the current H1 with this one and delete the old subtitle line — everything from section 1 onward stays as written.

---

## 0.1 Mission

**BeerFinder tells you where, near you, you can probably buy a specific kind of beer right now.**

That's it. Not what a beer tastes like, not who rates it highly, not which brewery made it — where to drive to get it, and how confident we are that the trip is worth making.

The gap this fills is narrow and real. Untappd and BeerAdvocate tell you what a beer *is*. Brewery finders tell you where breweries *are*. Store locators tell you where stores are. Nothing tells you which of those stores is likely to have the thing you actually want, because retail beer inventory is not published anywhere. Everyone in this space either avoids the question or quietly pretends to answer it.

We answer it honestly: as a confidence score over signals we can actually obtain, never as an inventory claim we can't back.

## 0.2 The user we're building for

Someone standing in their kitchen or sitting in a parked car, deciding where to go in the next thirty minutes. They know roughly what they want — sometimes a specific beer, more often a shape of beer ("a cheap IPA," "a good Belgian," "something like Green State Lager"). They have a car, a radius they're willing to drive, and a narrow window before the store closes.

Everything in the product serves that moment. A feature that doesn't help someone decide where to drive in the next thirty minutes is out of scope, however interesting.

## 0.3 What success looks like

Falsifiable targets for the pilot market. If we can't hit these, the premise is wrong and we should know early.

| Metric | Target | Why this one |
| --- | --- | --- |
| Result density | ≥5 ranked outlets for a style query within a 10-mile radius | Below this the product isn't useful enough to open |
| Precision at "Very likely" | ≥80% against held-out user confirmations | The top band is the promise; breaking it loses users permanently |
| "Open now" accuracy | ≥95% | Sending someone to a closed store is the most infuriating possible failure |
| Query latency, p95 | <2s from tap to rendered map | It's a decision made in a parking lot |
| Feedback rate | ≥15% of results receive a confirm or deny | This is the flywheel; below this the model never improves |
| Distribution footprint coverage | ≥90% of queried beers have a known state-level footprint | The dominant scoring term; gaps here produce confident nonsense |

Precision matters more than recall throughout. Missing a store that had the beer is a mild disappointment. Sending someone to a store that didn't is the failure that ends the relationship.

## 0.4 Non-goals

Explicit, because each of these is a plausible-sounding direction that would dilute the product or change its regulatory posture. An agent proposing work in any of these areas should be redirected to this section.

- **Not commerce.** No cart, no checkout, no delivery, no reservations. We are an information service and staying one keeps us outside three-tier licensing obligations entirely. This is the single most consequential boundary in the project.
- **Not a rating or social network.** No check-in feed, no follower graph, no scores of our own. User confirmations exist to train the availability model, not to be content. Untappd owns that space and owns it well.
- **Not a beer encyclopedia.** We classify beers only to the depth that improves search. Tasting notes, ingredient breakdowns, and brewing history are somebody else's product.
- **Not homebrew.** Recipes, calculators, and fermentation tracking are adjacent and tempting. They serve a different person on a different day.
- **Not a bar or taproom menu app.** Draft lists at bars are a live, well-served market. We are about buying beer to take home. Taprooms appear as outlets where they sell packaged product to go.
- **Not real-time inventory, ever, in any surface.** We don't have it. Displaying a count or a boolean would be a lie regardless of how the number was derived.
- **Not international at launch.** US only. The data sources, the three-tier system, and the licensing structure are all US-specific and don't generalize cheaply.
- **Not multi-market at launch.** One metro, proven, before the second.

## 0.5 Pilot market: North and Central New Jersey

Chosen deliberately, not by convenience, though the convenience is real — ground-truthing a scoring model means walking into stores and checking shelves, and that only happens if the stores are nearby.

New Jersey has a structural property that makes it an unusually clean first market. Corporate entities are limited to two retail distribution licenses, and municipalities may issue only one plenary retail distribution ("Class 44") license per 7,500 residents. The practical effect is that chain supermarkets and convenience stores almost entirely don't sell beer — a handful of exceptions exist where a chain holds its two licenses — and off-premise beer retail is concentrated in independent liquor stores.

Why that helps: the `outlet_archetype_affinity` term in the scoring function is trying to distinguish "dedicated bottle shop" from "gas station" from "supermarket." In most states that's a messy continuum. In New Jersey the license structure has already sorted the outlets for us, and the archetype signal arrives much cleaner than it would in, say, Pennsylvania or California.

Two complications to plan around:

- **Roughly 30 dry municipalities** prohibit retail alcohol sale entirely. These need to be modeled as geographic exclusions, or radius searches will return confident results in towns with no legal outlets.
- **Municipal hour ordinances vary** and can be stricter than the state ceiling. "Open now" correctness is a stated success metric, so hours need per-outlet sourcing rather than a statewide rule.

One upside worth capturing: the NJ ABC publishes licensee data. A public registry of exactly who may legally sell beer, by municipality, is a Tier 1 source for `dim_outlet` that most states don't offer as cleanly. Register it in `docs/data-sources.md` during Phase 1 and verify its currency before depending on it.

Success in this market is the gate for market two. Don't generalize the outlet archetype weights out of New Jersey without re-fitting — the license structure that makes them clean here is exactly what makes them non-transferable.

## 0.6 How to use this document

This is the design source of record. It is reference material, not a runbook — read the section you need, not the whole thing.

| You want to… | Read |
| --- | --- |
| Understand why classification is modeled the way it is | §1, §2 |
| Find or evaluate a data source | §3 |
| Work on the availability model | §4 |
| Touch the schema | §5 |
| Make a technology choice | §6 |
| Know what phase we're in and what's next | §7 |
| Check a legal or compliance boundary | §8 |
| Set up or change the Claude Code workflow | §9 |

**This document is descriptive of intent, not of current state.** It does not track what's built. Phase status lives in `docs/handoffs/`; operating constraints live in `CLAUDE.md`; decisions and their reasoning live in `docs/adr/`.

When this document and `CLAUDE.md` disagree, `CLAUDE.md` wins for behavior and this document gets corrected. When this document and an ADR disagree, the ADR wins — ADRs are dated and represent later thinking.

### Open questions

Unresolved as of the current revision. Each needs an owner and a date before Phase 3.

1. **BJCP commercial licensing.** Permission has not been requested. Until it's granted, the BJCP overlay stays detachable and the TTB class/type layer carries the load. Request early; a late "no" is expensive.
2. **BeerMenus: partnership or nothing.** Their data is the best availability proxy available. Scraping it is a terms-of-service exposure we'd rather not carry. Approach them before building anything that depends on it.
3. **Google Places cost at scale.** Fine for one metro. Model the cost curve before market two, and evaluate OpenStreetMap coverage in the pilot area as a partial substitute.
4. **Distribution footprint acquisition.** Brewer beer-finder pages are public but wildly inconsistent in format. Unknown whether this is a tractable scraping problem or needs per-brewer manual entry for the top N brands. Spike this in Phase 2 — it determines whether the dominant scoring term is cheap or expensive.
5. **Feedback rate.** The 15% target is an assumption, not an observation. If real users confirm at 3%, the flywheel doesn't spin and the model stays heuristic indefinitely. Instrument for this from the first beta.

---

*Sections 1 through 10 follow.*
