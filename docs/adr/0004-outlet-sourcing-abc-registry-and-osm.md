# ADR-0004 — Outlet sourcing: NJ ABC licensee registry as spine, OpenStreetMap as enrichment, Google Places excluded

**Status:** Accepted
**Date:** 2026-09-22

## Context

`PLAN.md` §3 lists Google Places as Tier 1 for retail outlets, opening hours, and business status. Phase 1 (§7) layers it over Open Brewery DB, and the README quick start requires a `GOOGLE_PLACES_API_KEY`. OpenStreetMap appears as a free alternative whose "coverage varies by metro". The NJ ABC licensee registry appears in §0.5 as a source to register during Phase 1.

The pipeline is a warehouse. dbt over DuckDB materializes into Postgres marts, which keep outlet name, address, coordinates, and hours between runs (§6). Google's Places API policies (`https://developers.google.com/maps/documentation/places/web-service/policies`, read 2026-09-22) state: *"You must not pre-fetch, cache, or store Places API content beyond the allowed exceptions."* The exception named there is the place ID, which may be stored indefinitely. Addresses, coordinates, and hours are not exempt.

Using Places therefore means one of two things: stop warehousing outlets, which the architecture depends on, or warehouse in breach of the terms. The repo is open source for self-hosting (ADR-0001), so a breach would not be ours alone. Every deployment runs the same ingest code.

## Decision

**The NJ ABC licensee registry is the authoritative spine of `dim_outlet`.**

- An outlet exists in our data only if it holds a New Jersey license that permits off-premise sale of packaged beer.
- License class codes are encoded only after reading current ABC documentation, with the verification date recorded (`nj-market-rules`).

**OpenStreetMap enriches and cross-checks.** It supplies coordinates, `opening_hours`, and shop type where tagged. A mismatch between the two sources is flagged for review, never auto-merged:

- An ABC licensee with no OSM match may be unmapped, or may not be operating.
- An OSM `shop=alcohol` feature with no ABC match may be miscategorized, may be closed, or may be licensed under a name we failed to match.

**Google Places is excluded** from ingest, enrichment, geocoding, and runtime lookups. It is registered in `docs/data-sources.md` as excluded, citing this ADR, so it isn't rediscovered.

Both remaining sources need entries in `docs/data-sources.md`, with terms read and `last_verified` recorded, before any fetcher is written.

## Consequences

### What this enables

- Whether something counts as an outlet rests on legal authority to sell beer, not on how a business categorized itself on a map.
- Outlet sourcing needs no API key and has no per-request billing, so a self-hoster's outlet pipeline runs without an account.

### What this costs

- **Hours coverage takes the direct hit, which endangers the "open now" target (≥95%, `PLAN.md` §0.3).** Places was the hours source. OSM `opening_hours` exists only where a mapper added it, and municipal ordinances rule out a statewide default (`nj-market-rules`). An outlet without sourced hours needs manual entry or shows "hours unknown", and it can't honestly appear in an "open now" filter.
- **Geocoding is unsolved.** Registry records carry addresses, not coordinates. Outlets without an OSM match need a geocoder, and that geocoder must be registered on its storage terms, not just its accuracy. Until then those outlets have no location and can't appear in a radius search.
- **Business status is lost.** Places reports whether a business is operating. The registry records who holds a license, which is not the same as an open storefront. A licensed but closed premises looks identical to an open one until the OSM cross-check or a manual visit catches it.
- **Matching registry records to OSM is a new resolution problem.** A licensee's legal name can differ from its storefront name. This is the fuzzy-matching risk CLAUDE.md warns about, applied to outlets, and it needs fixtures with known-correct matches before implementation.
- **ODbL obligations apply.** Every surface that shows OSM-derived data needs visible "© OpenStreetMap contributors" attribution. Any derived database we distribute, including a published dataset, carries ODbL share-alike obligations.
- **The registry's shape is unverified.** Its export format, update cadence, and whether it separates consumption from distribution licenses are all open (`nj-market-rules`). If it can't be filtered cleanly to distribution licenses, the spine needs manual curation.

## Alternatives considered

### Google Places as primary, as `PLAN.md` specified

The warehouse would store exactly the content the policy prohibits storing, and the open-source repo would ship that ingest code to every self-hoster.

### Store only place IDs and fetch details live at request time

This keeps storage within the terms, but every search then depends on a paid, keyed API call, which ADR-0001 rules out. "Open now" needs hours at query time, so this means one Places call per candidate outlet per search, all counted against the <2s p95 latency target.

### OpenStreetMap as the spine

OSM records what mappers have tagged, not who may legally sell beer. It misses unmapped stores and can include premises without a distribution license. The registry answers "who may sell here" and OSM does not.
