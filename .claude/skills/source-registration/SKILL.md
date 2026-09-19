---
name: source-registration
description: Registering external data sources in docs/data-sources.md — tier criteria, entry format, terms-of-service gate, and re-verification discipline. Use before writing any fetcher, scraper, or API client, when evaluating a candidate data source, or when a source's status or terms have changed.
allowed-tools: Read, Write, Edit, Grep, Glob, WebFetch, WebSearch
---

# Source registration

**No code may fetch, scrape, or call an external source that lacks an entry in `docs/data-sources.md`.** Registration is a gate, not documentation written afterward.

The reason is not bureaucratic. Sources in this domain die — BreweryDB, Punk API, and Drizly all shut down, and Untappd closed its API to new applications. A register that records status and verification dates is what prevents a dead or newly-gated source from being rediscovered and rebuilt against six months from now.

## Tier criteria

Tier is determined by **how the data may be obtained**, not by how useful it is.

| Tier | Criteria | Permitted use |
|---|---|---|
| **1** | Public. No auth, or a simple key we hold. License permits our use. Documented and stable | Depend freely |
| **2** | Gated — partner program, closed API, commercial terms, or an agreement we do not have | **May not be used.** Registered so it is not rediscovered and so the gate is documented |
| **3** | Obtainable but with legal or ethical exposure — scraping, terms-of-service ambiguity, aggressive rate needs | **Requires an accepted ADR before any code is written** |
| **4** | Dead — shut down, decommissioned, or permanently unavailable | Do not attempt. Recorded with shutdown date |

A source that *could* be scraped is not Tier 1 because the data is public. Tier 1 means the provider intends the access.

### Tier changes

**Tiers change and the transition is recorded, never overwritten.** Untappd moved from Tier 1 to Tier 2 when its API closed. Write:

```
Tier: 2 (was Tier 1 until 2024-01 — API closed to new applications)
```

A source that silently changes tier is how a compliance problem gets built on top of an old assumption.

## Entry format

Every source gets a row in its tier's table plus a detail block.

```markdown
### Open Brewery DB

- **Tier:** 1
- **Provides:** US breweries, brewpubs, bottleshops — name, type, address, lat/lng, phone, website
- **Access:** `https://api.openbrewerydb.org/v1/` — no auth. Full CSV/JSON dumps on GitHub
- **License:** MIT
- **Rate limit:** none documented; self-limit to 1 req/sec
- **Terms reviewed:** yes — 2026-09-16
- **Used by:** `pipeline/ingest/open_brewery_db.py` → `stg_obdb__breweries`
- **last_verified:** 2026-09-16
- **Notes:** Actively maintained. Prefer the bulk dump over the API for backfills
```

Every field is required. `none` and `unknown` are valid values; a missing field is not.

## Before registering

1. **Read the terms of service or license.** Not the summary on an aggregator page — the actual terms on the provider's site. Record the date you read them
2. **Find the rate limit.** If undocumented, record `none documented` and set a conservative self-limit
3. **Confirm the data is what you think.** Fetch one record and inspect it. A source registered on the strength of its marketing copy is unregistered
4. **Check it is not already registered under another name.** Grep `docs/data-sources.md` for the domain before adding

If any step cannot be completed, register the source with the gap recorded and **do not write code against it yet**.

## Terms-of-service gate

For anything that is not plainly public API access, answer in the entry:

- Does the provider offer an API or bulk export? If yes, scraping is not justified — use it
- Do the terms prohibit automated access?
- Does `robots.txt` disallow the paths involved?
- Is there a partnership or licensing route? If one exists, it is the preferred option and the ADR must explain why it was not taken

**A source with an available partnership route and no attempt to pursue it does not qualify for a Tier 3 ADR.** "It would take longer" is not a reason.

## Re-verification

Every Tier 1 and Tier 2 entry is re-verified quarterly. Re-verification is not reading the entry — it means:

1. The endpoint or download still responds
2. The schema is unchanged. If changed, note what and whether ingest breaks
3. The license or terms are unchanged. Re-read them; record the date
4. The rate limit is unchanged
5. Update `last_verified` to today

If a source has died, **move it to Tier 4 with the shutdown date. Never delete the entry.** The record of its death is the point.

## Dead sources

Tier 4 entries record: what it was, what it provided, when it shut down, and what replaced it if anything. They exist so the same source is not evaluated twice.

Currently: BreweryDB (deprecated), Punk API (decommissioned 2023), Drizly (shut down March 2024), openbeerdb (archived).

## Never

- Write a fetcher for an unregistered source
- Register a source without reading its actual terms
- Record a `last_verified` date for a check you did not perform
- Delete a Tier 4 entry to tidy the file
- Guess a rate limit, license, or endpoint. If unknown, write `unknown` and say so in the handoff