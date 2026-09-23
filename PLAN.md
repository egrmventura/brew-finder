# BeerFinder — Project Plan

Design source of record. Research current as of September 2026; source status was verified against live sources, so re-verify anything API-related before building against it.

---

## 0.1 Mission

**BeerFinder tells you where, near you, you can probably buy a specific kind of beer right now.**

**Scope** (ADR-0001, ADR-0003):
- **Retail is New Jersey only.** Every outlet we rank is a New Jersey premises (ADR-0003).
- **Beers and brewers are national.** A search for an out-of-state beer resolves to the right product and says honestly that it isn't distributed in New Jersey, instead of failing or matching the wrong beer (ADR-0003).
- **Non-commercial.** The project has no revenue of any kind. It depends only on free sources that any self-hoster can use without an agreement of their own (ADR-0001).
- **Open source.** The code is MIT-licensed and built to be self-hosted (ADR-0001).

That's it. Not what a beer tastes like, not who rates it highly, not which brewery made it — where to drive to get it, and how confident we are that the trip is worth making.

The gap this fills is narrow and real. Untappd and BeerAdvocate tell you what a beer *is*. Brewery finders tell you where breweries *are*. Store locators tell you where stores are. Nothing tells you which of those stores is likely to have the thing you actually want, because retail beer inventory is not published anywhere. Everyone in this space either avoids the question or quietly pretends to answer it.

We answer it honestly: as a confidence score over signals we can actually obtain, never as an inventory claim we can't back.

## 0.2 The user we're building for

Someone standing in their kitchen or sitting in a parked car, deciding where to go in the next thirty minutes. They know roughly what they want — sometimes a specific beer, more often a shape of beer ("a cheap IPA," "a good Belgian," "something like Green State Lager"). They have a car, a radius they're willing to drive, and a narrow window before the store closes.

Everything in the product serves that moment. A feature that doesn't help someone decide where to drive in the next thirty minutes is out of scope, however interesting.

## 0.3 What success looks like

Falsifiable targets for New Jersey (ADR-0003). Where a row has no target, the measurement is a finding, not a pass/fail. If we can't hit the targets, the premise is wrong and we should know early.

| Metric | Target |
|---|---|
| OSM coverage of NJ licensed off-premise retail | Measured, by county. No target — it's a finding |
| Result density | ≥5 ranked outlets within 10 miles for three NJ test points: dense suburb, rural county, near a dry town |
| Open-now accuracy | Measured against ~30 ground-truthed outlets. State sample size beside the number |
| NJ footprint coverage | ≥80% of beers in dim_beer carry a distributed-in-NJ flag with a source |
| Release extraction precision | ≥95% on 200 hand-labeled emails — deferred to Phase 2.5 |
| p95 latency | <2s |
| Cold-start setup | Stranger goes clone-to-running in under 30 minutes — deferred to Phase 4 |

Where each row comes from:
- OSM coverage and open-now accuracy: ADR-0004. Registry-to-OSM coverage and OSM `opening_hours` are what outlet quality now depends on.
- Result density and NJ footprint coverage: ADR-0003.
- Release extraction precision: ADR-0005.
- Cold-start setup: ADR-0001, because the project ships for self-hosting.

The former feedback-rate and "Very likely" precision metrics are dropped. Both were measured against user confirmations, and there is no user base; observations come only from manual logging and newsletters (ADR-0001).

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
- **Not national retail at this stage.** Outlets are New Jersey only; beers and brewers are national, stores are not. A second state would be a deliberate extension through the seams in §0.5, not scope creep (ADR-0003).
- **Not a commercial product.** No revenue of any kind: no ads, affiliate or referral links, paid tiers, or sponsored placement. Partner-gated and paid data sources are out permanently (ADR-0001). This is separate from the commerce boundary above. That one keeps us out of transactions; this one keeps us out of revenue.

## 0.5 Retail scope: New Jersey

New Jersey, statewide, is the settled retail scope. It is not a pilot and not a proving ground for a second metro. `dim_outlet` holds only New Jersey premises; beers and brewers remain national (ADR-0003).

Chosen deliberately, not by convenience, though the convenience is real — ground-truthing a scoring model means walking into stores and checking shelves, and that only happens if the stores are nearby.

New Jersey has a structural property that makes it an unusually clean market. Corporate entities are limited to two retail distribution licenses, and municipalities may issue only one plenary retail distribution ("Class 44") license per 7,500 residents. The practical effect is that chain supermarkets and convenience stores almost entirely don't sell beer — a handful of exceptions exist where a chain holds its two licenses — and off-premise beer retail is concentrated in independent liquor stores.

Why that helps: the `outlet_archetype_affinity` term in the scoring function is trying to distinguish "dedicated bottle shop" from "gas station" from "supermarket." In most states that's a messy continuum. In New Jersey the license structure has already sorted the outlets for us, and the archetype signal arrives much cleaner than it would in, say, Pennsylvania or California.

Two complications to plan around:

- **Roughly 30 dry municipalities** prohibit retail alcohol sale entirely. These need to be modeled as geographic exclusions, or radius searches will return confident results in towns with no legal outlets.
- **Municipal hour ordinances vary** and can be stricter than the state ceiling. "Open now" correctness is a stated success metric, so hours need per-outlet sourcing rather than a statewide rule.

One upside worth capturing: the NJ ABC publishes licensee data. A public registry of exactly who may legally sell beer, by municipality, is a Tier 1 source for `dim_outlet` that most states don't offer as cleanly. Register it in `docs/data-sources.md` during Phase 1 and verify its currency before depending on it.

### What must stay pluggable

The scope is settled, but code must not assume New Jersey is the only possible state (ADR-0003):

- **The distribution footprint lookup.** `distribution_footprint(brand, state_code)` keeps its state argument. Today it stores one New Jersey flag per brand with three values: distributed, not distributed, or unknown (`null`, never defaulted to "not"). It raises an error for any other state. A second state replaces the storage behind the function with a brand × state bridge, and callers don't change. No scoring or serving code reads the flag directly.
- **`dim_outlet.state_code`.** It stays a column even though every row is `NJ`, because it is what feeds the footprint seam.
- **Outlet sourcing.** Each state has its own outlet sourcing. New Jersey's is the NJ ABC licensee registry as the spine, with OpenStreetMap as enrichment and cross-check (ADR-0004). ABC license-class filtering belongs to that New Jersey source, not to shared code.

Don't generalize the outlet archetype weights out of New Jersey without re-fitting — the license structure that makes them clean here is exactly what makes them non-transferable.

## 0.6 How to use this document

This is the design source of record. It is reference material, not a runbook — read the section you need, not the whole thing.

| You want to… | Read |
|---|---|
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

1. **BJCP commercial licensing.** **Closed — ADR-0002.** BJCP content is not used, so no permission is requested.
2. **BeerMenus: partnership or nothing.** **Closed — ADR-0001.** Nothing: BeerMenus is out permanently, both scraping and partnership.
3. **Google Places cost at scale.** Fine for one metro. Model the cost curve before market two, and evaluate OpenStreetMap coverage in the pilot area as a partial substitute.
4. **Distribution footprint acquisition.** Brewer beer-finder pages are public but wildly inconsistent in format. Unknown whether this is a tractable scraping problem or needs per-brewer manual entry for the top N brands. Spike this in Phase 2 — it determines whether the dominant scoring term is cheap or expensive.
5. **Feedback rate.** The 15% target is an assumption, not an observation. If real users confirm at 3%, the flywheel doesn't spin and the model stays heuristic indefinitely. Instrument for this from the first beta.

---

## 1. The modeling problem hiding in the brief

The request bundles "level of quality (domestic, common, craft, fine craft, other)" as one axis. It isn't one axis. It's at least four, and they are only loosely correlated. Collapsing them into a single enum is the decision that will be most expensive to unwind later, because every downstream filter, index, and UI control inherits it.

| Axis | What it measures | Source of truth | Volatility |
|---|---|---|---|
| **Independence** | Who owns the brewer | Brewers Association craft-brewer definition | Changes on acquisition (SCD2) |
| **Production scale** | Annual barrelage / brewery archetype | BA market segments, TTB Brewer's Notice | Slow drift |
| **Price band** | What it costs at a given shelf | Retail observation | Per-store, per-week |
| **Prestige / scarcity** | How the market perceives it | Ratings, allocation, distribution breadth | Derived |

Goose Island 312 is the case that proves it. By the Brewers Association definition it isn't craft at all — AB InBev owns Goose Island, so it fails the independence pillar — while being a craft-*style* product at a mid price band with national distribution. A single `quality_tier` column has to lie about at least one of those. Four orthogonal attributes let a user ask for "craft-style pale lager, under $12/six-pack, widely stocked" and get a correct answer.

**The other trap in the brief:** the example "Zero Gravity Green Lager" is almost certainly Zero Gravity's *Green State Lager* (Burlington, VT). That isn't a nitpick — it's the single most common failure mode in this product category. Users type approximate names, shelf tags are abbreviated, scraped menus use inconsistent casing and punctuation. You need a deliberate **beer identity resolution layer** (canonical name + alias table + fuzzy match + GTIN where available) from day one, not bolted on at month six.

---

## 2. Previously defined classification systems

These are the existing, published schemes you can adopt rather than invent. Each has a different purpose, granularity, and — critically — a different license.

### 2.1 Our approach: TTB class/type plus a keyword-to-facet map

Styles are classified in two layers, and no BJCP content is used at all: no text, codes, vital statistics, or attribute tags (ADR-0002).

1. **TTB class/type (§2.4) is the required base.** It's federal, carries no license restriction, and every style has one.
2. **A manually maintained keyword-to-facet map is versioned in the repo.** It matches tokens in beer names, COLA fanciful names, and TTB class/type text (e.g. "IPA", "pilsner", "saison", "gose") to facet codes in `bridge_style_attribute`. The facet vocabulary (color, strength, fermentation, family, region, character) is project-authored. Adding a keyword is a reviewed change; adding a facet group requires an ADR.

Why not BJCP: its content is licensed for non-commercial use only. This repo is MIT-licensed, which grants everyone commercial use, so BJCP-derived files committed here would be offered under terms we can't grant (ADR-0002).

What it costs (ADR-0002):
- **Classification is only as good as the name.** A beer with no style word in its name gets its TTB class alone unless someone assigns facets by hand.
- **No per-style vital-statistics ranges.**
- **Granularity is family- and region-level**, not 100+ styles.
- **Ambiguous words need negative rules and fixtures.** "Pale", "wit", "session", and "imperial" each mean different things in different names.

### 2.2 Brewers Association Beer Style Guidelines

Updated roughly annually, ~150 styles, oriented toward commercial products and GABF/World Beer Cup judging rather than homebrew evaluation. Closer to what actually appears on retail shelves. Also copyrighted.

### 2.3 Brewers Association craft-brewer definition & market segments

The only quasi-official line on "is this craft," and the basis for your independence and scale axes.

**Craft brewer** = small AND independent:
- *Small:* ≤6,000,000 barrels annual production (~3% of US annual sales), attributed per alternating-proprietorship rules
- *Independent:* <25% owned or controlled (or equivalent economic interest) by an alcohol industry member that is not itself a craft brewer
- *Brewer:* holds a TTB Brewer's Notice, or controls the IP for brands brewed for it in the US

The "traditional" third pillar was dropped in December 2018 — worth knowing if you find older references.

**Six market segments** — use these directly as your brewer archetype enum:
- Microbrewery (<15,000 bbl, ≥75% sold off-site)
- Brewpub
- Taproom brewery
- Regional brewery (15,000–6,000,000 bbl)
- Contract brewing company
- Alternating proprietor

The **Independent Craft Brewer Seal** (launched June 2017, 5,700+ brewers using it) gives you a queryable roster of self-identified independents.

### 2.4 TTB class and type designations (27 CFR Part 7)

The *legal* taxonomy for malt beverages. Coarse — "malt beverage," "ale," "lager," "stout," "porter," plus flavored/specialty designations — and nowhere near granular enough for a consumer filter.

**But it is US federal government output and carries no commercial licensing restriction.** That makes it the safe backbone. Model it as your legally-clean base layer, with BJCP or BA styles as an enriched overlay you can detach if licensing goes sideways.

### 2.5 Open Brewery DB `brewery_type` enum

A ready-made, free, no-auth brewer classification: `micro`, `nano`, `regional`, `brewpub`, `large`, `planning`, `bar`, `contract`, `proprietor`, `closed`. Roughly maps to the BA segments and requires zero negotiation.

### 2.6 Untappd style list

~200 styles with implicit parent/child structure (`IPA - American`, `IPA - New England`, `IPA - Imperial / Double`). This is the vernacular taxonomy — what consumers actually say and what shelf tags actually print. Most valuable as an **alias/crosswalk layer** mapping colloquial style names onto BJCP or TTB codes, even though the API itself is unavailable (see §3).

### 2.7 BeerXML / recipe schemas

`BeerXML` and the Brewfather schema define style records for recipe interchange. Mostly relevant for ingredient and vital-statistics modeling, not retail. Useful if you ever want to infer style from a label's stated ABV/IBU.

### 2.8 GS1 GTIN / UPC

The only globally unique, commercially unrestricted product identifier in this space. If you can capture the barcode, you have the join key that survives every naming inconsistency. Make `gtin` a first-class natural key on `dim_beer`.

---

## 3. Data source assessment

This is where the project lives or dies. The honest summary: **brewery and store location data is excellent and free; beer product data is mediocre; real-time retail inventory does not exist as a public feed.**

### Tier 1 — Solid, free, build on these

| Source | Provides | Access |
|---|---|---|
| **Open Brewery DB** | ~all US breweries, brewpubs, bottleshops: name, type, full address, lat/lng, phone, website | Free, no auth. `api.openbrewerydb.org/v1/`. Also full CSV/JSON/Postgres dumps on GitHub (MIT). Actively maintained — commits through mid-2026 |
| **TTB Public COLA Registry** | Every approved malt beverage label: brand name, fanciful name, class/type, permit holder, origin, approval date. Images from 1999 on | Free, no registration. `ttbonline.gov/colasonline/publicSearchColasBasic.do`. CSV export capped at 500 rows per search — paginate |
| **TTB Brewer's Notice list** | Licensed brewery roster, permit numbers | Free, public |
| **Google Places API** | Retail outlets, opening hours, geo, business status | Paid, reliable, well-documented |
| **OpenStreetMap** | `shop=alcohol`, `shop=beverages`, `craft=brewery` tags, often with `opening_hours` | Free, ODbL. Coverage varies by metro |

The COLA registry is the underrated one. It's the closest thing to a canonical US beer product registry, it's federal, and it's unrestricted. Commercial enrichment layers exist (e.g. COLA Cloud) that add OCR'd label text, extracted barcodes, and LLM-inferred fields — worth evaluating versus building your own COLA parser.

### Tier 2 — Gated or partner-only

- **Untappd API** — closed to new applications since at least January 2024, and still closed. Even with legacy access it's 100 calls/hour. Treat as unavailable.
- **Untappd for Business** — taproom/bar digital menus. Partner-gated, commercial terms.
- **DigitalPour** — tap list API for bars and taprooms. Partner access.
- **DSDLink** — alcohol beverage product catalog aimed at the distribution tier. Worth a conversation if this ever becomes a business.
- **Instacart / DoorDash / Uber Eats** partner APIs — real retailer inventory, but partner-gated and mostly grocery-shaped.

### Tier 3 — Gray zone

- **BeerMenus** — ~442,000 beers and ~57,000 venues, the largest public craft beer menu dataset. No official API. Third-party scrapers exist on Apify. Data is user-reported, so freshness varies. This is the single best availability proxy you can realistically obtain, and also the one with the clearest terms-of-service exposure. Read their ToS before you depend on it, and consider approaching them for a partnership instead.
- **Retailer sites** — Total Wine, Binny's, and regional chains publish per-store inventory on the web. Scraping is against most of their ToS.

### Tier 4 — Dead, ignore

- **BreweryDB** (PintLabs) — deprecated. All client libraries archived.
- **Punk API** — decommissioned by BrewDog in 2023; repos archived June 2023. Dataset survives as an npm package if you want BrewDog recipes.
- **Drizly** — shut down end of March 2024 after Uber folded it into Uber Eats.
- **openbeerdb.com** — archived.
- **beer.db / openbeer** — public domain but effectively unmaintained since ~2024. Good for bootstrapping, not for currency.

### A dead end worth knowing about

The 17 alcohol control states (AL, ID, IA, ME, MI, MS, MT, NH, NC, OH, OR, PA, UT, VT, VA, WV, WY) publish genuinely useful structured catalog and per-store inventory data. **It's spirits data.** Control-state monopolies cover distilled spirits; beer almost everywhere flows through private retail. Virginia ABC's ~3,000-item catalog is liquor, mixers, vermouth, and Virginia wines. Don't plan a beer feature around it.

---

## 4. The core architectural consequence

There is no inventory feed. So **availability is a scored prediction, not a lookup** — which the brief already intuits with "will likely have." Commit to that explicitly, because it changes the schema, the UX, and the honesty of your claims.

```
P(beer b in stock at outlet o at time t) ≈ σ(
      w₁ · distribution_footprint(brand(b), state(o))
    + w₂ · outlet_archetype_affinity(type(o), tier(b), style(b))
    + w₃ · seasonality(style(b), week(t))
    + w₄ · recency_decay(last_observed_sighting(b, o), t)
    + w₅ · proximity(brewery(b), o)          -- self-distribution radius
    + w₆ · brand_velocity(b, market(o))
)
```

**Why each term earns its place:**

- **Distribution footprint dominates.** A beer is legally unavailable in states where its brewer has no distributor agreement. This is binary, knowable, and eliminates most false positives for free. Brewers publish "beer finder" maps; COLA state registrations corroborate. Goose Island 312 is national. Green State Lager is effectively Vermont and immediately adjacent. Getting this one term right is worth more than a sophisticated model on the other five.
- **Outlet archetype** encodes that a dedicated bottle shop stocks fine craft, a gas station stocks domestic macro, a supermarket stocks the middle. This is where your independence/scale/price axes actually pay off.
- **Recency decay** turns a sparse trickle of observations — scraped menus, user reports — into a usable signal that degrades honestly rather than going stale silently.
- **Proximity to brewery** captures self-distributed local beer, which the distribution-footprint term misses entirely.

**Cold start:** ship with w₁, w₂, w₅ as hand-tuned heuristics. They require zero user data and get you to a defensible product. Every user confirmation ("found it" / "wasn't there") becomes a labeled training row. Retrain w when you have volume.

**UX obligation:** never render this as a stock count. Render it as confidence — "Very likely," "Usually stocked," "Sometimes," "Call ahead" — plus the observation date. Overclaiming inventory you don't have is the fastest way to lose a user permanently.

---

## 5. Dimensional model

Star schema, conformed outlet dimension so breweries and retailers are searchable in one geo query.

### Dimensions

**`dim_beer`** — grain: one distinct commercial product (brand + fanciful name + package where it matters)
```
beer_sk               (surrogate)
gtin                  (natural key when available — the good one)
ttb_id                (natural key from COLA, 14 char)
canonical_name
brewer_sk             → dim_brewer
style_sk              → dim_style
abv, ibu, srm         (nullable — often unknown)
package_format        (can, bottle, draft, crowler)
package_size_ml
is_seasonal, season_window
first_seen_date, last_seen_date
```

**`dim_beer_alias`** — the identity resolution layer, earns its own table
```
alias_sk, beer_sk, alias_text, alias_source, confidence, normalized_text
```
Populate from scraped shelf tags, menu text, user search misses. `normalized_text` is lowercased, punctuation-stripped, and trigram-indexed. This is what catches "green lager" → Green State Lager.

**`dim_style`** — hierarchical, plus a facet bridge
```
style_sk, style_code, style_name, parent_style_sk,
og/fg/ibu/srm/abv min-max,
ttb_class_type          ← the license-safe layer
```
No BJCP code column, and no BJCP crosswalk anywhere (ADR-0002).

**`bridge_style_attribute`** — many-to-many facets (BJCP-style attributes plus your own)
```
style_sk, attribute_code, attribute_group
```
`attribute_group` ∈ {color, strength, fermentation, family, region, character}. This is what lets "belgian beers" resolve to a facet query rather than a hardcoded list.

**`dim_brewer`** — **SCD Type 2, and this is not optional**
```
brewer_sk, brewer_natural_key, brewer_name,
brewery_type              (ODB enum)
ba_segment                (BA market segment)
annual_bbl_estimate
is_independent            ← time-varying
parent_company
hq_lat, hq_lng
self_distribution_radius_km
effective_from, effective_to, is_current
```
Ownership changes are the whole reason the independence axis is interesting. Goose Island's independence status has a before and an after. A Type 1 dimension throws away the fact that makes your classification meaningful.

**`dim_outlet`** — conformed across retailers and breweries
```
outlet_sk, outlet_natural_key, outlet_name,
outlet_type        (bottle_shop, supermarket, convenience, big_box,
                    brewery_taproom, brewpub, bar, distributor)
lat, lng, geog     (PostGIS geography column, GiST indexed)
address fields, state_code, county_fips
license_type, license_number
source_system      (odb | google_places | osm | manual)
```

**`dim_outlet_hours`** — day-of-week open/close, plus an exceptions table for holidays. Getting "open now" right is an underrated differentiator; half the competing apps get it wrong.

**`dim_date`**, **`dim_time`** — standard.

### Facts

**`fact_availability_observation`** — grain: one sighting
```
observation_sk, beer_sk, outlet_sk, observed_date_sk,
source_type        (manual | newsletter | osm | licensee)
observed_status    (in_stock | out_of_stock | discontinued)
price_cents, package_format, confidence_weight
```
`source_type`:
- **Current set:** `manual` (ADR-0001), `newsletter` (ADR-0005), and `osm` and `licensee` (ADR-0004).
- **Removed:** `scrape` and `partner_feed`. No permitted source produces them (ADR-0001).

**`fact_availability_score`** — grain: beer × outlet × day; the model output, the thing the app actually queries
```
beer_sk, outlet_sk, date_sk, score, score_band,
contributing_signals (jsonb), model_version
```

**`fact_price_observation`** — grain: beer × outlet × date; feeds the price-band axis, which is a *store* attribute, not a beer attribute.

**`fact_search_event`** — every query, every result set, every tap. This is how you learn what people actually want and where your coverage is thin. Log from day one.

---

## 6. Technology choices

The system splits cleanly into a batch enrichment pipeline and a low-latency geo serving layer. Don't try to make one tool do both.

**Serving:** Postgres 18 + PostGIS on Neon or Supabase. `ST_DWithin` on a GiST-indexed geography column handles radius search; `pg_trgm` handles fuzzy beer-name matching. Both problems solved by one database. Resist BigQuery here — it's the wrong shape for per-user point lookups and the cost model is hostile to it.

**Pipeline:** dbt over DuckDB locally, materializing to Postgres. Staging → intermediate → marts. Source freshness tests on every ingested feed. If the enrichment volume ever justifies it, swap the compute for BigQuery without touching the model layer — which is the point of keeping dbt in the middle.

**Orchestration:** GitHub Actions on a cron for the first year. Dagster only when the DAG genuinely outgrows it.

**API:** Next.js 16 App Router, TypeScript, route handlers. One repo, one language, server components for the initial map render.

**Web:** Next.js + MapLibre GL (not Mapbox — MapLibre avoids per-load billing surprises). Tailwind.

**Mobile:** Expo / React Native. Shares TypeScript types and the entire API client with web; one `npx expo prebuild` gets you both iOS and Android. If the app stays fundamentally a search-and-map surface, Capacitor wrapping the web build is a legitimate cheaper path — decide at Phase 5, not now.

**Monorepo:** pnpm workspaces. `apps/web`, `apps/mobile`, `packages/types`, `packages/api-client`, `packages/scoring`, `pipeline/`.

---

## 7. Phased build

### Phase 0 — Repo and taxonomy seed (week 1)
Monorepo scaffold, CI, Postgres+PostGIS provisioned. Load TTB class/type into `dim_style`, and seed the keyword-to-facet map that populates `bridge_style_attribute` (ADR-0002). No BJCP data is loaded. Deliverable: a queryable style taxonomy with working facet search. Nothing user-facing — this is the vocabulary everything else speaks.

### Phase 1 — Geo and outlets (weeks 2–3)
New Jersey statewide (ADR-0003). Google Places is not used at any step (ADR-0004).

- **Register first.** Put the NJ ABC licensee registry and OpenStreetMap in `docs/data-sources.md`, with terms read and `last_verified` recorded, before any fetcher is written (ADR-0004).
- **Registry spine.** Load the registry filtered to licenses that permit off-premise sale of packaged beer, and make it the spine of `dim_outlet`. Encode license class codes only from current ABC documentation.
- **OSM matching.** Match the registry against a New Jersey OSM extract for coordinates, `opening_hours`, and shop type, and flag mismatches in both directions for review. Matching fixtures come before matching code. This produces the OSM-coverage-by-county finding in §0.3.
- **Unmatched outlets.** An outlet with no OSM match has no location until a geocoder is registered on its storage terms (ADR-0004).
- **Open Brewery DB.** Ingest it in full as brewer candidates for Phase 2. Only New Jersey premises become outlets (ADR-0003).

Deliverable: "show me every licensed place selling packaged beer within 5 miles that's open now." Outlets without sourced hours are excluded from "open now" rather than guessed (ADR-0004). **This alone is a usable product.** Ship it.

### Phase 2 — Beer and brewer dimensions (weeks 4–6)
Parse the TTB COLA registry into `dim_beer`. Build the alias table and fuzzy resolver. Populate `dim_brewer` with BA segments, independence flags, and SCD2 ownership history for the top ~200 brewers by volume. Deliverable: search a beer by approximate name, get a canonical product with a correct classification on all four axes.

### Phase 2.5 — Release dataset (duration not yet estimated)
Stand up the separate public dataset repository (ADR-0005). A scheduled GitHub Actions workflow reads the maintainer-operated inbox and extracts release facts: brewery, beer, announced date, package, and any outlets the newsletter names. It validates the facts and commits them as versioned files. Only extracted facts are published, each referencing its source newsletter; newsletter prose and images are never republished. Extraction fixtures with known-correct outputs come before extraction code. Once the dataset's name, URL, schema, and license exist, register it in `docs/data-sources.md` as Tier 1. Deliverable: the app ingests release facts from the dataset's public files, and a source freshness test catches staleness. It comes after Phase 2 because extraction resolves names against `dim_beer` and its aliases, and before Phase 3 because newsletters are one of only two observation sources (ADR-0001).

The week ranges on Phases 3 and 4 predate this phase and have not been re-estimated.

### Phase 3 — Availability signals (weeks 7–10)
- **NJ footprint.** Build the New Jersey distribution flag per brand: distributed, not distributed, or unknown, with a source and a verification date. It sits behind `distribution_footprint(brand, state_code)` (ADR-0003). Brewer beer-finder pages are the main input. Each one is registered before any fetcher, and scraping one is Tier 3, which needs an accepted ADR first.
- **Scoring.** Implement the scoring function with hand-tuned weights, tests first. `brand_velocity` (w₆) has no permitted source and stays at zero weight (ADR-0001).
- **Observations.** Load observations from manual logging and from the newsletter dataset built in Phase 2.5 (ADR-0001, ADR-0005). No other observation source exists.

Deliverable: `fact_availability_score` populated for New Jersey statewide (ADR-0003).

### Phase 4 — Web app (weeks 11–14)
Map + filter panel across the four axes. Confidence bands, never counts. Outlet detail with hours and "last seen" dates, "hours unknown" where no hours are sourced, and visible "© OpenStreetMap contributors" attribution wherever OSM-derived data appears (ADR-0004). Deliverable: the web app covering New Jersey statewide (ADR-0003), plus a documented self-host setup path. A stranger must get from clone to running in under 30 minutes, which is the cold-start metric in §0.3 (ADR-0001).

### Cut phases
- **Former Phase 5 (feedback loop) is cut.** Availability observations come only from manual logging and brewery newsletters, so user confirm/deny is not an observation source (ADR-0001).
- **Former Phase 6 (mobile) is cut.** No ADR records this decision yet.

---

## 8. Legal and compliance

Not optional, and cheaper to design in than retrofit.

- **Three-tier system.** Brewer → distributor → retailer is mandated in most states. Your app is none of the three, which is good — you're an information service. Keep it that way. The moment you facilitate a transaction, you inherit licensing obligations in every state you operate in.
- **Age gating.** Required by both app stores for alcohol-related apps. Neutral date-of-birth entry, no pre-filled defaults.
- **No delivery, no cart, no "buy now."** Direct users to the store. Referral or affiliate arrangements with retailers change your regulatory posture — get advice before adding one.
- **BJCP commercial licensing.** Flagged in §2.1. Request permission early, and keep the TTB layer as your fallback so a "no" is survivable rather than fatal.
- **Scraping.** BeerMenus and retailer sites have terms. Respect `robots.txt`, rate limit conservatively, cache aggressively, identify your agent honestly. Prefer a partnership conversation over a scraper you'll have to hide.
- **Accuracy disclaimer.** Surface it in the UI, not buried in a settings page. "Availability is estimated" is both legally prudent and, handled well, a trust signal rather than a weakness.

I'm not a lawyer and none of this is legal advice — before you monetize or add anything transactional, talk to someone who does alcohol beverage law.

---

## 9. Claude Code workflow

Plan-first throughout, which matches how you already work. The structural points specific to this project:

### Repo layout

```
beerfinder/
├── CLAUDE.md
├── .claude/
│   ├── commands/
│   │   ├── plan-phase.md
│   │   ├── new-source.md
│   │   ├── model-check.md
│   │   ├── scoring-eval.md
│   │   └── handoff.md
│   └── settings.json
├── docs/
│   ├── architecture.md
│   ├── data-sources.md        ← §3, kept current with status + last-verified date
│   ├── taxonomy-decisions.md  ← ADRs for classification choices
│   └── handoffs/              ← dated session handoff notes
├── apps/{web,mobile}
├── packages/{types,api-client,scoring}
└── pipeline/{dbt,ingest,tests}
```

### CLAUDE.md — what actually belongs in it

Keep it short enough to be read every session. The things Claude will otherwise get wrong repeatedly:

1. **The four-axis rule.** Never collapse independence, scale, price, and prestige into one field. State it as a hard constraint; it's counterintuitive enough that it needs restating.
2. **Availability is scored, never asserted.** No code path may return a boolean "in stock." Any PR that does is wrong by construction.
3. **Source tiering.** Tier 1 sources may be depended on; Tier 3 requires an explicit decision recorded in `docs/data-sources.md`. Never add a scraper without that entry.
4. **`dim_brewer` is SCD2.** Ownership history is load-bearing, not bookkeeping.
5. **Naming conventions** — `_sk` surrogate, `_natural_key`, `dim_`/`fact_`/`bridge_` prefixes.
6. **Licensing constraint on BJCP content** — so nothing gets hardcoded in a way that's painful to detach.
7. Stack versions, package manager (pnpm), test command, lint command.

### Custom slash commands worth building

- **`/plan-phase <n>`** — reads `docs/architecture.md` and the phase section of the plan, produces a task breakdown with file-level targets, stops before writing code. Your standard plan-first entry point, scoped to this project's phases.
- **`/new-source <name>`** — scaffolds an ingest module: fetcher, schema contract, dbt staging model, freshness test, and a `docs/data-sources.md` entry with a last-verified date. Every new feed goes through this, so none ever arrives undocumented.
- **`/model-check`** — validates a proposed schema change against the dimensional rules in CLAUDE.md before any migration is written. Catches the grain violations and accidental Type-1 flattening that are painful to reverse once data lands.
- **`/scoring-eval`** — runs the availability model against a held-out observation set, reports precision at each confidence band. Turns scoring changes from vibes into measurements.
- **`/handoff`** — writes a dated note to `docs/handoffs/`: what changed, open decisions, what the next session should pick up. Feeds your existing context-reconciliation pattern.

### Subagent delegation

Three workstreams that parallelize cleanly with minimal shared state:

| Agent | Scope | Boundary |
|---|---|---|
| **Pipeline** | `pipeline/`, dbt models, ingest | Owns the marts contract; doesn't touch app code |
| **API/serving** | Route handlers, `packages/api-client`, queries | Consumes the marts contract; doesn't write dbt |
| **Frontend** | `apps/web`, `apps/mobile` | Consumes `packages/types`; doesn't write queries |

The contract between them is `packages/types` plus the dbt marts schema. Keep both under review discipline and the agents rarely conflict.

### Prompt sequence per phase

1. **Context load** — point at `CLAUDE.md`, the relevant `docs/` files, and the most recent handoff note.
2. **`/plan-phase n`** — get the breakdown. Review and edit the plan before any code. This is where you catch the wrong abstraction, and it's cheap here and expensive later.
3. **Decompose by workstream** — hand each slice to a subagent with an explicit file-scope boundary.
4. **Tests before implementation** on anything in `packages/scoring` — the scoring function is the part where a plausible-looking wrong answer is hardest to notice by inspection.
5. **`/model-check`** before any migration.
6. **`/handoff`** at session end.

### Where to be most careful with AI assistance

The scoring function and the identity resolver are the two places where generated code will look correct and be subtly wrong — a fuzzy matcher that silently collapses two distinct beers, or a weighting that produces confident scores from near-zero evidence. Both need real test fixtures with known-correct answers, written before the implementation. Everything else in this stack is well-trodden enough that normal review suffices.

---

## 10. First three concrete actions

1. **Register the NJ ABC licensee registry and OpenStreetMap in `docs/data-sources.md`.** Read their actual terms. For the registry, confirm the export format, the update cadence, and whether it separates consumption licenses from distribution licenses. No outlet fetcher can be written before this, so everything in Phase 1 waits on it (ADR-0004).
2. **Load TTB class/type with the keyword-to-facet seed, plus the registry and a New Jersey OSM extract.** Before building anything else, confirm you can answer two queries: "licensed NJ outlets within 10 km of a point" and "styles matching a facet". Together they validate the geo index and the facet bridge (ADR-0002, ADR-0003, ADR-0004).
3. **Write the COLA registry parser against one brewer's label history, then run the keyword map over those labels.** Pick a brewer with a small, clean catalog. This calibrates identity resolution at small scale before you take on 400,000 products. It also gives an early measure of how many labels get a facet beyond their TTB class, which is the main cost ADR-0002 accepted.