# Data source register

Every external source this project reads, or has decided not to read. The rules are in the `source-registration` skill; this file is the register itself.

## Required procedure

1. **No fetcher without an entry.** No code may fetch, scrape, or call a source that lacks an entry here with a `last_verified` date (CLAUDE.md constraint 4). `/new-source` refuses unregistered sources.
2. **Terms are read before registering.** That means the provider's own terms, not an aggregator's summary. Record the date they were read.
3. **Tier 1 may be depended on freely.** Every source must also be free, and usable by any self-hoster without an agreement of their own (ADR-0001).
4. **Tier 2 may not be used.** It is registered so the gate is documented and the source isn't rediscovered.
5. **Tier 3 needs an accepted ADR in `docs/adr/` before any code is written.** A source with an open partnership route doesn't qualify. Under ADR-0001, no partnership route may be pursued.
6. **Tier 4 is dead.** Never delete a Tier 4 entry; the record of the death is the point.
7. **Re-verify quarterly.** Every Tier 1 and Tier 2 entry is re-checked each quarter:
   - the endpoint responds
   - the schema is unchanged
   - the terms are re-read and unchanged
   - the rate limit is unchanged

   Then update `last_verified`. **Never update `last_verified` for a check that wasn't performed.**
8. **Record tier changes; never overwrite them.** Write the old tier and the reason, for example: `Tier: 2 (was Tier 1 until 2024-01 — API closed to new applications)`.

## Entry format

Every source gets a row in its tier's table and a detail block below. Every field is required. `none` and `unknown` are valid values; a missing field is not. An entry with `unknown` Access, License, or Rate limit gets no code yet.

```markdown
### <Source name>

- **Tier:** <1–4, with any transition recorded>
- **Provides:** <what data, at what granularity>
- **Access:** <endpoint or download location, auth required>
- **License:** <license or terms name>
- **Rate limit:** <documented limit, or "none documented; self-limit to …">
- **Terms reviewed:** <yes — YYYY-MM-DD | no>
- **Used by:** <ingest module → staging model(s), or none>
- **last_verified:** <YYYY-MM-DD of the last check actually performed>
- **Notes:** <anything the next reader needs>
```

## Tier 1 — Depend freely

| Source | Provides | Access | last_verified |
| --- | --- | --- | --- |
| *none registered yet* | | | |

## Tier 2 — Gated or excluded; may not be used

| Source | Provides | Why not usable | last_verified |
| --- | --- | --- | --- |
| Google Places | Retail outlets, hours, geo, business status | Its terms prohibit storing Places content; excluded (ADR-0004) | 2026-09-22 |

## Tier 3 — Requires an accepted ADR

| Source | Provides | Authorizing ADR | last_verified |
| --- | --- | --- | --- |
| *none registered* | | | |

## Tier 4 — Dead

| Source | Was | Shut down | Replaced by |
| --- | --- | --- | --- |
| BreweryDB | Brewery and beer API | Deprecated; date unknown | None recorded |
| Punk API | BrewDog recipe API | 2023 | None recorded |
| Drizly | Alcohol delivery marketplace | End of March 2024 | Folded into Uber Eats |
| openbeerdb | Open beer database | Archived; date unknown | None recorded |

---

## Entries

### Google Places

- **Tier:** 2 — excluded (was listed as Tier 1 in `PLAN.md` §3 until ADR-0004, 2026-09-22)
- **Provides:** Retail outlets, opening hours, geo, and business status (`PLAN.md` §3)
- **Access:** Paid API; requires an API key
- **License:** Google Maps Platform Terms of Service, and the Places API policies
- **Rate limit:** not applicable — not used
- **Terms reviewed:** yes — 2026-09-22. Only the Places API policies page (`https://developers.google.com/maps/documentation/places/web-service/policies`) was read. The general Google Maps Platform Terms page could not be read in full.
- **Used by:** none. No code may call it for ingest, enrichment, geocoding, or runtime lookups (ADR-0004)
- **last_verified:** 2026-09-22. This covers the terms clause only; no endpoint check was made, because the source is not used.
- **Notes:**
  - **The clause:** *"You must not pre-fetch, cache, or store Places API content beyond the allowed exceptions."* The only exception named is the place ID.
  - **Why it's excluded:** this project warehouses outlet data, and the repo ships its ingest code to every self-hoster, so using Places would ship a terms violation (ADR-0004).
  - **It's also paid,** which ADR-0001 excludes independently.

### BreweryDB

- **Tier:** 4
- **Was:** A brewery and beer API (PintLabs)
- **Shut down:** Deprecated; all client libraries archived. Date unknown.
- **Replaced by:** None recorded
- **Source of record:** `PLAN.md` §3 and the `source-registration` skill
- **last_verified:** not verified. Carried from `PLAN.md` §3 and not independently checked.

### Punk API

- **Tier:** 4
- **Was:** BrewDog's recipe API
- **Shut down:** Decommissioned by BrewDog in 2023; repositories archived June 2023
- **Replaced by:** None recorded. `PLAN.md` §3 says the dataset survives as an npm package; that package is not identified here.
- **Source of record:** `PLAN.md` §3 and the `source-registration` skill
- **last_verified:** not verified. Carried from `PLAN.md` §3 and not independently checked.

### Drizly

- **Tier:** 4
- **Was:** An alcohol delivery marketplace
- **Shut down:** End of March 2024
- **Replaced by:** Folded into Uber Eats. Any Uber Eats partner API is out under ADR-0001.
- **Source of record:** `PLAN.md` §3 and the `source-registration` skill
- **last_verified:** not verified. Carried from `PLAN.md` §3 and not independently checked.

### openbeerdb

- **Tier:** 4
- **Was:** An open beer database (openbeerdb.com)
- **Shut down:** Archived; date unknown
- **Replaced by:** None recorded
- **Source of record:** `PLAN.md` §3 and the `source-registration` skill
- **last_verified:** not verified. Carried from `PLAN.md` §3 and not independently checked.
