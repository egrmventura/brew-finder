# ADR-0003 — New Jersey retail scope, national beer and brewer scope

**Status:** Accepted
**Date:** 2026-09-22

## Context

`PLAN.md` treats New Jersey as a *pilot*. It speaks of "North and Central New Jersey", "one metro", and "the gate for market two" (§0.4, §0.5, §7). It also says to ingest Open Brewery DB "in full", which would put breweries from every state into the conformed `dim_outlet`. The footprint term is written `distribution_footprint(brand(b), state(o))`, which implies a brand × state matrix.

That plan conflates two scopes:

- **Outlets need ground truth.** Someone must be able to walk in and check the shelf. The New Jersey license structure is also what makes the archetype signal clean (`nj-market-rules`).
- **Beers and brewers have no such geography.** A New Jersey shopper asks about Green State Lager (Vermont) or Goose Island 312 (national). Identity resolution, ownership history, and classification have to work for those beers whether or not they reach a New Jersey shelf.

Left undecided, the footprint matrix gets built for every state, and all but one of those states are never queried or ground-truthed.

## Decision

- **Retail scope is New Jersey, statewide.** `dim_outlet` holds only premises in New Jersey, across the whole state rather than just the north/central pilot area. Brewery taprooms qualify only when located in New Jersey.
- **Beer and brewer scope is national.** `dim_beer`, `dim_beer_alias`, and `dim_brewer` cover US products and brewers whether or not they reach New Jersey. Out-of-state breweries from Open Brewery DB feed `dim_brewer`, not `dim_outlet`.
- **Distribution footprint is one New Jersey flag per brand, not a state matrix.** The flag has three values: distributed in NJ, not distributed in NJ, and unknown. Unknown is stored as `null` and never defaulted to "not distributed". The footprint-coverage target (`PLAN.md` §0.3) depends on distinguishing "no" from "we don't know". Each flag records the date it was last verified.

**The seam:** the footprint lookup keeps its state argument, `distribution_footprint(brand, state_code)`, fed from `dim_outlet.state_code`, which stays on `dim_outlet`.

- Today's single implementation answers only for `'NJ'` and raises an error for any other state rather than returning a value.
- Adding a state means two things: replacing the storage behind that function with a brand × state bridge table, and adding outlet sourcing for the new state. The scoring function and its callers don't change.
- No scoring or serving code may read the flag directly. Doing so hard-codes NJ into the callers and closes the seam.

The flag's physical placement (table and column name) is a schema decision for `/model-check` and `docs/architecture.md`, not for this ADR. Its name must not read as a stock boolean (CLAUDE.md constraint 2).

## Consequences

### What this enables

- A New Jersey user searching for an out-of-state beer gets an honest "not distributed in NJ" instead of a fuzzy match to a different beer or an empty result. Green State Lager is the canonical case (`PLAN.md` §1).
- The footprint term, which `PLAN.md` §4 identifies as dominant, costs one fact per brand to populate.
- Every stored footprint value is one we can check against New Jersey shelves.

### What this costs

- **Searches go blind at the state line.** Radius searches stop there. A 10-mile search from Phillipsburg or Trenton excludes Pennsylvania stores across the Delaware River even when they are closer, and the same happens along the New York border. The result-density target (≥5 outlets within 10 miles, §0.3) will be hardest to meet in border towns.
- **A second state means a backfill.** Every brand's footprint must be sourced again for the new state, because the NJ flag carries no information about anywhere else. Where a brewer's finder page lists other states, that data is discarded today.
- **Footprint history is lost.** A single current flag with a verification date doesn't record when a brand entered or left New Jersey. Unless the flag is later made time-variant, a brand's exit erases its history.
- **Self-hosters outside New Jersey get beer search with no stores.** The repo becomes useful elsewhere only after someone implements outlet sourcing and footprint storage for their state behind the seam.
- **Most of `dim_beer` never reaches a result.** The COLA registry is national, so we will carry, resolve, and maintain many products whose only answer is "not distributed in NJ".

## Alternatives considered

### Brand × state matrix now

We can ground-truth only New Jersey, so footprint values for every other state would be stored with no way to catch errors in them. The one caller that exists passes `'NJ'`. The seam preserves the option at the cost of an interface rather than an unverifiable table.

### New Jersey scope for beers and brewers too

Identity is national. Restricting `dim_beer` to NJ-distributed products makes "green lager" either fail outright or fuzzy-match to some other lager, the failure mode `PLAN.md` §1 names as the most common in this category. It would also cut `dim_brewer` down to brewers that distribute in New Jersey, so the independence axis would depend on distribution rather than on ownership history.

### Keep the north/central New Jersey pilot boundary

The licensing structure that makes New Jersey a clean market is statewide (`nj-market-rules`). A sub-state boundary adds an arbitrary line inside the market, and a second edge problem on top of the state line.
