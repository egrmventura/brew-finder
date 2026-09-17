# BeerFinder — Project Plan

Design source of record. Research current as of September 2026; source status was verified against live sources, so re-verify anything API-related before building against it.

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
|---|---|---|
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

1. **BJCP commercial licensing.** Permission has not been requested. Until it's granted, the BJCP overlay stays detachable and the TTB class/type layer carries the load. Request early; a late "no" is expensive.
2. **BeerMenus: partnership or nothing.** Their data is the best availability proxy available. Scraping it is a terms-of-service exposure we'd rather not carry. Approach them before building anything that depends on it.
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

### 2.1 BJCP Style Guidelines (2021 beer edition)

The most rigorous hierarchical taxonomy in existence. 34 numbered categories, roughly 100+ styles, each with an alphanumeric code (`21A` American IPA, `1D` American Wheat Beer). Every style carries quantified vital statistics — OG/FG, IBU, SRM, ABV ranges — which makes it genuinely machine-usable rather than just descriptive.

The 2021 edition also added a **style attribute facet system**: tags like `craft-style`, `north-america`, `pale-color`, `standard-strength`, `wheat-beer-family`, `any-fermentation`. This is exactly the multi-axis grouping the brief asks for, already designed by people who thought hard about it. Adopt the facet model even if you don't adopt BJCP's content.

- Official: `bjcp.org/bjcp-style-guidelines/` (PDF, DOCX), 2021 is still current
- Parsed JSON/XML/YAML: `github.com/bjcp-brasil/styleguide-2021`, `github.com/bgaze/bjcp-guidelines`
- Legacy XML + DTD + XSD: `legacy.bjcp.org/styles04/xml/`

**⚠ Licensing blocker.** BJCP content is copyrighted and explicitly not licensed for commercial use without written permission. Every parsed repo above carries the same restriction. If this app ever monetizes, you need either BJCP permission or a clean-room style taxonomy. Plan for this now — request permission early, and structure `dim_style` so BJCP codes live in a swappable crosswalk table rather than being the primary key.

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
bjcp_code               ← swappable overlay, nullable
```

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
source_type        (scrape | user_report | partner_feed | menu)
observed_status    (in_stock | out_of_stock | discontinued)
price_cents, package_format, confidence_weight
```

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
Monorepo scaffold, CI, Postgres+PostGIS provisioned. Load BJCP parsed JSON and TTB class/type into `dim_style` + `bridge_style_attribute`. Deliverable: a queryable style taxonomy with working facet search. Nothing user-facing — this is the vocabulary everything else speaks.

### Phase 1 — Geo and outlets (weeks 2–3)
Ingest Open Brewery DB in full. Layer Google Places for non-brewery retail in one pilot metro. Build `dim_outlet` + hours. Deliverable: "show me every place selling beer within 5 miles that's open now." **This alone is a usable product** and it depends on zero uncertain data. Ship it.

### Phase 2 — Beer and brewer dimensions (weeks 4–6)
Parse the TTB COLA registry into `dim_beer`. Build the alias table and fuzzy resolver. Populate `dim_brewer` with BA segments, independence flags, and SCD2 ownership history for the top ~200 brewers by volume. Deliverable: search a beer by approximate name, get a canonical product with a correct classification on all four axes.

### Phase 3 — Availability signals (weeks 7–10)
Build distribution footprint from brewer beer-finder pages — this is the highest-value scraping target and mostly the brewers' own public maps. Implement the scoring function with hand-tuned weights. Backfill observations from whatever Tier 3 sources you've decided you're comfortable with. Deliverable: `fact_availability_score` populated for the pilot metro.

### Phase 4 — Web app (weeks 11–14)
Map + filter panel across the four axes. Confidence bands, never counts. Outlet detail with hours and "last seen" dates. Deliverable: public beta, one metro.

### Phase 5 — Feedback loop (weeks 15–16)
User confirm/deny on every result. This is the flywheel — it converts users into your inventory feed and is the only path to data no competitor has. Build it before mobile.

### Phase 6 — Mobile (weeks 17–22)
Expo build, native location permissions, App Store and Play Store review. Budget real time for alcohol-related app review policies on both stores; they are stricter than general apps and both require verified age gating.

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

1. `git init`, scaffold the monorepo, provision Postgres+PostGIS, write `CLAUDE.md` with the four-axis rule and the scored-availability rule as hard constraints.
2. Pull the full Open Brewery DB dump and the BJCP parsed JSON. Load both. Confirm you can answer "breweries within 10km of a point, filtered by style facet" before building anything else — it validates the geo index and the facet bridge in one query.
3. Write the COLA registry parser against a single brewer's label history (pick one with a small, clean catalog) to calibrate the identity resolution problem at small scale before you take on 400,000 products.