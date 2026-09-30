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
| Open Brewery DB | Breweries, brewpubs, taprooms and related venues (worldwide; about 70% US) — name, type, address, lat/lng, phone, website. No county field | GitHub dumps (MIT); public API, no auth | 2026-09-23 |
| US Census Bureau cartographic boundary files (county) | County polygons with county name and state FIPS, for point-in-polygon county assignment. Provisional; see entry for the terms gap | `www2.census.gov` download, no auth | 2026-09-23 |
| US Census Bureau 2020 ZCTA-to-county relationship file | One row per ZCTA-county overlap, with land and water area of the overlap, for assigning a county from a 5-digit postal code. Provisional; see entry for the terms gap | `www2.census.gov` download, no auth | 2026-09-23 |

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

### Open Brewery DB

- **Tier:** 1
- **Provides:** Breweries, brewpubs, taprooms and related venues — name, type, street address, city, state or province, postal code, country, lat/lng, phone, website. Worldwide: 11,848 records in the API meta endpoint on 2026-09-23, of which 8,224 are in the United States. There is **no county field** in the dump or the API.
- **Access:**
  - Bulk dumps, no auth: the `openbrewerydb/openbrewerydb` repo on GitHub, default branch `master`. Root files are `breweries.csv`, `breweries.json`, and `breweries.sql` (a PostgreSQL dump). The CSV raw URL is `https://raw.githubusercontent.com/openbrewerydb/openbrewerydb/master/breweries.csv`.
  - API, no auth: `https://api.openbrewerydb.org/v1/breweries`, with `/v1/breweries/meta` for counts.
- **License:** MIT (`LICENSE` in the GitHub repo, "Copyright (c) 2025 Open Brewery DB"). The site FAQ adds: "You are welcome to use the dataset for any projects with credit to Open Brewery DB." Give that credit, and keep the MIT notice when redistributing the data.
- **Rate limit:** none documented; self-limit to 1 req/sec. The site says "No sign-ups, API keys, or rate limits" and the FAQ says the API is community-supported with no SLA. Prefer the bulk dump over the API.
- **Terms reviewed:** yes — 2026-09-23. Read on the provider's own properties: the site homepage, `/documentation`, `/faq`, `robots.txt` (`Allow: /`), and the GitHub repo `LICENSE` and file listing. The site has no separate terms-of-service page that I found.
- **Used by:** `scripts/ingest/load_open_brewery_db.mjs` (manual, New Jersey only) → `raw.open_brewery_db_breweries` → `stg_obdb__breweries`.
- **last_verified:** 2026-09-23. Checks performed today:
  - API responded with a real record.
  - The meta endpoint responded.
  - The CSV header was read.
  - The repo license was read.
  - The FAQ and documentation pages were read.
  - Not checked: the JSON and SQL dumps' contents. The CSV fetch was truncated by the tool, so its full row count is unverified.
- **Notes:**
  - **CSV header (actual):** `id,name,brewery_type,address_1,address_2,address_3,city,state_province,postal_code,country,phone,website_url,longitude,latitude`
  - **API record fields (actual, one record fetched):** the same fields, plus two duplicates, `state` (same value as `state_province`) and `street` (same value as `address_1`). The CSV has no `state` or `street`. Nullable fields come back as JSON `null`, for example `address_2`.
  - **`brewery_type` values in the live data (meta `by_type`, 2026-09-23):**
    - `micro` 5864
    - `brewpub` 3929
    - `closed` 642
    - `planning` 639
    - `regional` 239
    - `contract` 210
    - `large` 137
    - `proprietor` 67
    - `taproom` 47
    - `bar` 41
    - `nano` 22
    - `cidery` 7
    - `beergarden` 3
    - `location` 1
  - **`taproom` does exist:** 47 records, in the US and England. The documentation page lists only ten types and omits `taproom`, `cidery`, `beergarden`, and `location`, so the docs are stale against the data. The GitHub README also lists `beer brand`, but no `beer brand` record appeared in the meta counts.
  - **Deprecation flags:** the documentation marks `large` and `bar` as deprecated.
  - **Provenance:** per the FAQ, the data was initially scraped from the Brewers Association around August 2018, then maintained by community contributions. The MIT license is the project's own; it does not cover any upstream rights.
  - **Scope:** the dataset is worldwide, so ingest must filter on `country`.
  - **Coordinates:** some values carry float noise, for example `51.17625779999999`. Some records may lack lat/lng; the count was not checked.
  - **County:** assign it downstream with the Census county boundary source below.
  - **No partnership route needed.** The bulk dump exists and its license permits use.

### US Census Bureau cartographic boundary files (county)

- **Tier:** 1 (provisional — pending review; see the terms gap below)
- **Provides:** County and county-equivalent polygons for the US. Used to assign a county to a lat/lng by point-in-polygon. The 1:500,000 file is a simplified representation, and the Census page says it is designed for small-scale thematic mapping.
- **Access:** `https://www2.census.gov/geo/tiger/GENZ2025/shp/cb_2025_us_county_500k.zip` (about 11 MB, last modified 2026-04-23 per the directory listing). No auth. The 2025 vintage was the latest listed on the Census cartographic boundary page on 2026-09-23. Other resolutions in the same directory: `cb_2025_us_county_5m.zip` and `cb_2025_us_county_20m.zip`. The same directory also has a `cb_2025_us_county_within_cd119_500k.zip` variant, which was not evaluated. The full TIGER/Line alternative is at `https://www2.census.gov/geo/tiger/TIGER2025/`, which was not evaluated.
- **License:** unknown as a stated license on the Census pages read. Details are in the Notes.
- **Rate limit:** none documented; self-limit to a single download per refresh. The file changes at most annually, so ingest should cache it.
- **Terms reviewed:** partial — 2026-09-23. The Census Open Data page was read, along with the naming-convention page and the API Terms of Service. Those terms cover the Census data API, not file downloads. No statement specific to the boundary-file downloads was found. Do not treat this as a completed terms review.
- **Used by:** none yet. Ingest does not exist. `pipeline-engineer` owns it.
- **last_verified:** 2026-09-23. Checks performed today:
  - The download directory listing showed the file present.
  - The Census pages were read.
  - Not checked: the zip itself was not downloaded, so its contents were not inspected.
- **Notes:**
  - **Fields (from Census metadata, not the 2025 file):** `STATEFP` (state FIPS), `COUNTYFP` (county FIPS), `COUNTYNS`, `GEOIDFQ`, `GEOID` (state FIPS plus county FIPS), `NAME` (county name), `NAMELSAD` (name plus legal/statistical description, e.g. "Cook County"), `STUSPS` (state abbreviation), `STATE_NAME`, `LSAD`, `ALAND`, `AWATER`. This list comes from the Census ISO metadata XML for `cb_2023_us_county_20m.shp` (meta.geo.census.gov, vintage 2023). It was **not** confirmed against the 2025 500k `.dbf`. Ingest must check the actual header.
  - **Gap — the license was not found on a Census page.** What was found: the Census Open Data page says Census Bureau data is "freely available for use and re-use by the public"; the Census Software license page says government-authored software is not copyrighted (17 U.S.C. § 105). The data.gov catalog record for the 2025 KML county file lists CC0 (`creativecommons.org/publicdomain/zero/1.0/`) but also carries an access level of "non-public"; the catalog is not the provider's own terms page. The API Terms of Service require "This product uses the Census Bureau Data API but is not endorsed or certified by the Census Bureau" and bar using the data to identify individuals; that applies to the API, not to these files. The boundary files contain no personal data. A human should confirm before code is written.
  - **Fitness warning from the Census naming-convention page:** these files "should not be used for: geographic analysis including area or perimeter calculation; geocoding addresses; determining precise geographic area relationships." Cartographic boundaries are generalized, so a point near a county line can land in the wrong county. The full-resolution TIGER/Line county file avoids that; it was not evaluated and needs its own review.
  - **Coverage:** the county file covers US states, DC, and territories. Points outside it, such as non-US brewery rows, yield no county.
  - **Not vetted:** `robots.txt` on `www2.census.gov` was not checked.
  - **Not used for the newsletter target list:** ZIP-to-county (the ZCTA relationship file below) was chosen instead, per the user.

### US Census Bureau 2020 ZCTA-to-county relationship file

- **Tier:** 1 (provisional — pending review; see the terms gap below)
- **Provides:** A national relationship file between 2020 ZIP Code Tabulation Areas (ZCTAs) and 2020 counties. Used to assign a county to a brewery from its 5-digit postal code. Target rows: about 100 in New Jersey, plus PA (Bucks, Northampton, Monroe, Pike), NY (Orange, Rockland, Sullivan) and DE (New Castle).
- **Access:** `https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt` (6.5M, last modified 2021-12-09 per the directory listing at `https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/`). No auth. The file was fetched and its header and first rows were read. The Census relationship-files page (`https://www.census.gov/geographies/reference-files/time-series/geo/relationship-files.2020.html`) does not link this file; the directory listing is where it was found. Record layout: `https://www.census.gov/programs-surveys/geography/technical-documentation/records-layout/2020-zcta-record-layout.html`.
- **License:** unknown as a stated license on the Census pages read. Details are in the Notes.
- **Rate limit:** none documented; self-limit to a single download per refresh. The file is a 2020-vintage product dated 2021-12-09, so ingest should cache it.
- **Terms reviewed:** partial — 2026-09-23. The Census Open Data page (page last revised 2026-07-08), the relationship-files page, the ZCTA record layout page and the ZCTA guidance page were read. None states terms specific to this file. Do not treat this as a completed terms review.
- **Used by:** none yet. Ingest does not exist. `pipeline-engineer` owns it.
- **last_verified:** 2026-09-23. Checks performed today:
  - The directory listing showed the file present.
  - The file was fetched and the header and first rows were read.
  - The record layout page was read.
  - Not checked: a full download, the full row count, rows for the specific NJ, PA, NY and DE ZCTAs, and `robots.txt` on `www2.census.gov`.
- **Notes:**
  - **Format:** pipe-delimited (`|`) text with a header row. The record layout page does not state the delimiter; it was observed in the file.
  - **Header (actual, as fetched):** `OID_ZCTA5_20|GEOID_ZCTA5_20|NAMELSAD_ZCTA5_20|AREALAND_ZCTA5_20|AREAWATER_ZCTA5_20|MTFCC_ZCTA5_20|CLASSFP_ZCTA5_20|FUNCSTAT_ZCTA5_20|OID_COUNTY_20|GEOID_COUNTY_20|NAMELSAD_COUNTY_20|AREALAND_COUNTY_20|AREAWATER_COUNTY_20|MTFCC_COUNTY_20|CLASSFP_COUNTY_20|FUNCSTAT_COUNTY_20|AREALAND_PART|AREAWATER_PART`. It matches the record layout page field for field.
  - **Key fields:** `GEOID_ZCTA5_20` (5-digit ZCTA), `GEOID_COUNTY_20` (5 characters, state FIPS plus county FIPS), `NAMELSAD_COUNTY_20` (for example "Baldwin County"), `AREALAND_PART` and `AREAWATER_PART` (land and water area of the overlap, in square meters). There is no separate state field; the state is the first two characters of `GEOID_COUNTY_20`. Keep `GEOID_COUNTY_20` as text so leading zeros survive.
  - **Multi-county ZIPs:** one row per ZCTA-county pair. A ZCTA spanning two counties appears as two rows with the same ZCTA fields and different county fields and overlap areas. Observed example: ZCTA 00698 has two rows, Guayanilla Municipio (`72059`) and Yauco Municipio (`72153`). To pick one county per ZIP, ingest needs a rule, for example the row with the largest `AREALAND_PART`. That rule is a design decision, not something the file states.
  - **Rows with no ZCTA:** the first rows of the file have empty ZCTA fields (the leading eight fields are blank) and only county fields. Those appear to be county parts covered by no ZCTA. Ingest must drop rows with an empty `GEOID_ZCTA5_20`. This was inferred from the first five rows only.
  - **Fitness caveat — ZCTAs are not USPS ZIP codes.** Census says ZIP Code is a USPS trademark for point-based delivery routes, and that ZCTAs are "generalized areal representations" of ZIP Codes built from 2020 census blocks. Some ZIPs have no ZCTA, for example PO-box-only or single-building ZIPs, and a brewery's ZIP may not match a ZCTA or may sit in a different county than its ZCTA's dominant county. The 2020 vintage will lag ZIP changes after 2020. Rows whose ZIP has no ZCTA match need a fallback, such as the county boundary source above. Whether any target rows hit this was not checked.
  - **Gap — the license was not found on a Census page.** The Census Open Data page says the Bureau shares public data as open data to support "entrepreneurship, innovation, scientific discovery, and commercial activity" and asks for citation. It states no license or reuse terms for this file, and no file-specific terms were found on the relationship-files page. The data is government-produced and contains no personal data. A human should confirm before code is written.
  - **Alternative:** the Census county boundary entry above assigns county from lat/lng instead. It has its own fitness warning near county lines.
  - **No partnership route needed.** A public bulk file exists.

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
