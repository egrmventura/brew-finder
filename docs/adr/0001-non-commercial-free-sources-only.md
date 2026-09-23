# ADR-0001 — Non-commercial scope, free sources only

**Status:** Accepted
**Date:** 2026-09-22

## Context

`PLAN.md` was written with commercial options left open. It defers BJCP permission to "if this app ever monetizes" (§2.1), rates DSDLink "worth a conversation if this ever becomes a business" (§3), keeps a BeerMenus partnership as open question 2 (§0.6), and lists Google Places, a paid API, as Tier 1. Each of these tells a later reader that partner data or paid APIs are coming.

The project is non-commercial and ships as MIT-licensed open source for self-hosting. Every data dependency therefore runs in someone else's deployment as well as ours. A source that needs a paid key, a partner agreement, or commercial terms can't be passed on to a self-hoster. Even if we obtained access, a self-hoster would receive a codebase that doesn't work without an agreement they don't have.

Left undecided, partner-shaped sources stay "pending" indefinitely. Phase 3 (§7) says to "backfill observations from whatever Tier 3 sources you've decided you're comfortable with," which invites reopening the question every phase.

## Decision

The project earns no revenue: no ads, no affiliate or referral links, no paid tiers, no sponsored placement. It depends only on sources that are free to use and whose terms let any self-hoster use them without an agreement of their own.

Consequently, and permanently:

- **BeerMenus is out**, both scraping and partnership. This closes `PLAN.md` open question 2.
- **Untappd is out**: the API and Untappd for Business.
- **Partner-gated APIs are out**: DigitalPour, DSDLink, and the Instacart / DoorDash / Uber Eats partner APIs.
- **Paid APIs are out**, whatever their free-tier allowance.

Availability observations come from two sources only: **manual logging** (shelf checks entered by a person who looked) and **brewery newsletters** (see ADR-0005).

"Non-commercial" describes how this project operates. It is not a restriction on users. The MIT license permits commercial downstream use, and this ADR does not try to prevent it.

## Consequences

### What this enables

- Any self-hoster can run the full pipeline with no accounts, keys, or agreements beyond what the repo documents.
- Tier 2 entries in `docs/data-sources.md` become a permanent "no" rather than "not yet". The register loses its pending-partnership category.
- With no revenue there is no affiliate link, which removes the referral arrangements `PLAN.md` §8 warns would change our regulatory posture.

### What this costs

- **The best availability proxy is gone.** `PLAN.md` §3 calls BeerMenus "the single best availability proxy you can realistically obtain" (~442,000 beers, ~57,000 venues, per §3). Nothing we are permitted to use comes close in volume.
- **`recency_decay` (w₄) will be sparse for most beer × outlet pairs.** Manual logging produces observations at the rate one person visits stores. The score rests on w₁ (distribution footprint), w₂ (outlet archetype), and w₅ (brewery proximity) for longer than §4 assumed, possibly indefinitely.
- **`brand_velocity` (w₆) has no source.** Market-level sales velocity comes from commercial feeds. The term stays at zero weight unless a free source appears.
- **The §0.3 targets are at risk.** "Precision at *Very likely* ≥80%" is measured against held-out confirmations, which manual logging produces slowly. "≥5 ranked outlets within 10 miles" at a useful confidence band may not be reachable in low-density municipalities. Both targets need revisiting against the reduced evidence rather than being assumed.
- **Manual logging costs labor and introduces bias.** Someone has to walk into stores. Observations will cluster where the logger lives and shops, which biases the model toward those outlets.

## Alternatives considered

### Keep partnership routes open (BeerMenus, DSDLink)

A partnership grants access to us, and self-hosters do not inherit it. Code that depends on partner data either fails in every deployment but ours or needs a private credential we can't distribute. It also puts the project into commercial negotiation, which this decision rules out.

### Scrape BeerMenus as a Tier 3 source under an ADR

The `source-registration` skill disqualifies a Tier 3 ADR where a partnership route exists and has not been pursued. We cannot pursue one without going commercial. The scraper would also ship in the open-source repo and run in every deployment, multiplying the terms-of-service exposure by the number of self-hosters.

### Allow paid sources within a free-tier allowance

A free tier is a quota on one account, not a license. Every self-hoster would need their own billing account, and one burst of usage turns it into a charge. Google Places has a separate, independent terms problem as well (ADR-0004).
