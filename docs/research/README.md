# docs/research — CSV rules

Interim research format for brewery/newsletter-target tracking, pending the real
`dim_`/`bridge_` models in `pipeline/dbt/models/marts/` (data-modeler's domain, once
`entity-resolution` exists per CLAUDE.md's gate). These rules apply to every
`.csv` in this directory and every future change or addition to them.

## Shape

Four files, decomposed by grain (see `dimensional-grain` skill for why a flat
"one row per destination" table collapses distinct grains):

- `dim_brewer.csv` — Grain: one row per brewer (`brewer_natural_key`) per identity version, unique on (`brewer_natural_key`, `effective_from`).
  SCD2: a rename produces a new `brewer_sk` under the same
  `brewer_natural_key`; a pure relocation does not (the brewer's own
  attributes didn't change). A closure does not either; it sets
  `operating_status` on the latest version (rule 6).
- `dim_location.csv` — Grain: one row per brewer (`brewer_natural_key`) per site, unique on `location_natural_key`.
  A site is a physical premises as far as the research can tell premises
  apart. With no street-address or OSM-id data available yet,
  `location_natural_key` is `<brewer_natural_key>__<city-slug>`, not a true
  premises identity, plus a suffix where one brewer has two sites in one city
  (`rinn_duin_brewing__toms_river__pre_rename` / `__post_rename`) — see
  **Known limitations** below.
- `bridge_brewer_location.csv` — Grain: one row per brewer version (`brewer_sk`) per location (`location_sk`) per continuous occupancy interval, unique on (`brewer_sk`, `location_sk`, `effective_from`).
  The interval is `[effective_from, effective_to)`. No-overlap is the
  correctness rule here, not no-gaps — a closed-then-reopened site has a
  legitimate gap.
- `fact_newsletter_target.csv` — Grain: one row per brewer (`brewer_natural_key`) on the newsletter-target list, unique on `brewer_natural_key`.
  Brand-level, per the diagnosis that a mailing list is a brand relationship,
  not a location one; the row references the brewer through `brewer_sk`.
  Only brewers sourced from an active newsletter-target row get a fact row; a
  brewer known only from a historical closure record has no `added_date`
  evidence and gets none.

## Where each source field went

Every column of `newsletter-targets.csv` and `expired-targets.csv` is carried
into the four tables:

| Source field | Destination |
| --- | --- |
| `name` | `dim_brewer.brewer_name` (brand stem for multi-location brewers) |
| `website` | `dim_brewer.website`, per version, so a rename keeps its old site. Differing per-location URLs are listed in `dim_brewer.source_note` |
| `city`, `county`, `state`, `postal_code`, `county_alternates`, `county_note` | `dim_location` |
| `cohort` | `dim_location.cohort` per location; `fact_newsletter_target.cohort` per brand (`nj` if any location is `nj`) |
| `date_added` | `dim_location.added_date` per location; `fact_newsletter_target.added_date` is the brand's earliest |
| `brewery_type` | `bridge_brewer_location.brewery_type`. It describes the establishment at a site (e.g. `brewpub`), so it sits at occupancy grain, not on the brewer |
| `research_note` | `source_note` on the location and bridge rows it concerns |
| `reason` | `bridge_brewer_location.occupancy_reason` |
| `closure_date`, `closure_date_reference`, `closure_date_basis` | `effective_to`, `effective_to_reference`, `effective_to_basis` on `dim_brewer` and `bridge_brewer_location` |
| `superseded_by` | Structure where a rename or relocation links rows; the text also stays in `source_note` |
| `source` | `bridge_brewer_location.source` (blank for rows from `newsletter-targets.csv`, which has no source column; their provenance is in `research_note`) |
| `revision` | Not carried. It flagged which flat-file row superseded another; the bridge's rename and relocation rows now express that directly |

Neither source file has an email or newsletter signup address. No such
column exists here, and none may be added with guessed values.

## The 7 rules

1. **`brewer_sk` is derived from its own row, never numbered.** It is the
   lowercase hex md5 of `brewer_natural_key` and `effective_from` joined with
   `-`, built the way `dbt_utils.generate_surrogate_key(['brewer_natural_key',
   'effective_from'])` builds its key. For example, `cross_keys_brewing_co`
   from `2018-03-09` is `7e77ef7ecbc20bc0d0ed29e6df9328fb`. The sequence
   format used until 2026-09-30 (`bwr_00000001`) renumbered 237 of 253 keys
   when one row was added, so it must not come back.
2. **`location_sk` is derived the same way from `location_natural_key`
   alone** (`dim_location` has no `effective_from`). For example,
   `cross_keys_brewing_co__williamstown` is
   `408ad56b8734d2f762cc6e8cdb099537`.

   Both are written by `scripts/research/build_tables.py`; never type one by
   hand. To add a row, put a temporary token in its `_sk` column and in every
   bridge or fact row that references it, then run the script. Changing a key
   column (for example, replacing a `PLACEHOLDER:` `effective_from`) changes
   that row's `_sk`. The script rewrites every reference to it in the same
   run, so fact rows stay attached. `--check` exits non-zero if any table is
   out of date.
3. **Quote every field that contains any character outside
   `[A-Za-z0-9-]`.** A bare postal code (`08205-9563`) or a bare date
   (`2026-09-01`) stays unquoted; anything with a space, punctuation, or an
   underscore — including header names like `brewer_sk` — gets wrapped in
   double quotes, with embedded `"` doubled per RFC 4180. **Exception for
   key values:** values in `brewer_sk`, `location_sk`, `brewer_natural_key`,
   and `location_natural_key` stay unquoted when they contain only letters,
   digits, hyphens, and underscores (e.g. `7e77ef7ecbc20bc0d0ed29e6df9328fb`,
   `cross_keys_brewing_co__williamstown`). Their header names are still
   quoted under the general rule.
4. **All dates are `yyyy-mm-dd`.** Where the source only supports year or
   year-month precision, the usable date column is padded (`2019` →
   `2019-01-01`, `2025-09` → `2025-09-01`) and the original raw value is kept
   in a separate, clearly-named reference field — never silently discarded.
   `9999-12-31` is the open-ended `effective_to` sentinel for a
   currently-active interval, matching the `dimensional-grain` skill's SCD2
   convention; `effective_to` uses the literal string `unknown` when no end
   date evidence exists.
   **`effective_from` is never `unknown`** in `dim_brewer` or
   `bridge_brewer_location`. Each date carries a `_reference` column (the
   raw value at its original precision, blank when none exists) and a
   `_basis` column (where the value came from), for both `effective_from`
   and `effective_to`.
   Resolution order:
   1. A researched opening date (for a reopened or relocated site, the
      start of the *current continuous* occupancy), padded per above.
   2. Otherwise, if `effective_to` is a real end date: one month before it,
      with `effective_from_basis` beginning `ESTIMATE:`.
   3. Otherwise: `2026-09-01`, with `effective_from_basis` beginning
      `PLACEHOLDER:`.

   `dim_brewer.effective_from` is the earliest `effective_from` across that
   brewer version's bridge rows. `ESTIMATE:` and `PLACEHOLDER:` values are
   not evidence and must be replaced when a real date is found; the basis
   says whether the date was searched for and not found, or never searched.
5. **`source_note` is capped at 320 characters.** The current data's longest
   note is 188 characters; 320 gives headroom without inviting essay-length
   notes. A note that would exceed the cap must be shortened by whoever is
   editing it — tooling must never silently truncate, since that destroys
   information rather than just reformatting it.

6. **Closing a brewer sets `operating_status` on its latest version; it never
   adds a version or clears `is_current`** (ADR-0010). `operating_status` is
   `operating`, `closed`, or `moved_out_of_state`. To record a closure:
   1. Confirm the brewer's closure from evidence. A source `reason` of
      `closed` is evidence; a guess is not.
   2. On the brewer's latest `dim_brewer` row, set `operating_status` to
      `closed` (or `moved_out_of_state`), keep `is_current = true`, and set
      `effective_to` to the closure date. Put the raw value in
      `effective_to_reference` and its source in `effective_to_basis`. With no
      closure date, write `unknown`; never a guessed date.
   3. On the open `bridge_brewer_location` rows for that brewer version, set
      `effective_to` the same way, `is_current = false`, and
      `occupancy_reason = closed`.
   4. Leave `fact_newsletter_target` alone unless the brewer is on the target
      list. A closed brewer must not be subscribed to, so change its `status`
      and say why in a note.
   5. Run `python3 scripts/research/build_tables.py`. It fails if the brewer
      lacks exactly one current row, if the current row is not the latest
      version, or if `operating_status` and `effective_to` disagree.

   A closed brewer that reopens under the same `brewer_natural_key` is a new
   version: `operating_status = operating`, a researched `effective_from` (rule
   4), `effective_to = 9999-12-31`, and the closed version becomes
   `is_current = false`. The gap between the two versions is legitimate. If the
   new occupant is a different brewer, use a new `brewer_natural_key` instead
   (see the identity-matching rules). Queries for live brewers filter
   `operating_status = 'operating'`, not `is_current` alone.

7. **A fact row points at the brewer version valid on its own date.** A
   `fact_newsletter_target` row with an `added_date` carries the `brewer_sk`
   whose `[effective_from, effective_to)` contains that date. A row with no
   `added_date` (60 today: the 59 `border` rows and one `nj` row, see Known
   limitations) may only point at a brewer with a single version, where no date
   could change which row is valid. Never fill in a date to satisfy this rule.
   There is no `schema.yml` for these CSVs, so `build_tables.py` stands in for
   the four SCD2 tests: exactly one `is_current` per brewer (rule 6), no
   overlapping versions, `effective_from` before `effective_to`, and this
   fact rule. It fails on each. A gap between versions is a warning, because a
   closed brewer that reopens has one legitimately.

## Identity-matching rules (how rows became brewer/location/bridge rows)

These are mechanical, evidence-based rules — not fuzzy matching, and not a
substitute for the `entity-resolution` skill once it exists. Nothing here
merges or splits an entity without a documented signal already present in the
source data.

- **Same `brewer_natural_key` across a rename or relocation** only when the
  source's own `reason` column says `relocated` or `renamed` *and* a
  `superseded_by` / `research_note` pair links a specific historical row to a
  specific current row. A `reason` of `closed` — even with a "successor" or
  "rebranded by the owner's son" note — creates a **separate**
  `brewer_natural_key` for the new occupant; the source already draws that
  distinction (e.g. Devil's Creek Brewery → Raccoon Taproom, and Bucket
  Brigade Brewery → Obscura Brewing Co. are both `closed`, not `renamed`, and
  are kept separate here).
- **One brewer, multiple simultaneous locations** only when two or more
  *current* rows share both (a) the same normalized website domain and (b) a
  common name stem split on `" - "` or `" of "` (e.g. `Tonewood Brewing` /
  `Tonewood Brewing - Barrington`; `Triumph Brewing Co of Princeton` /
  `...of New Hope`). A shared domain alone is not enough — e.g. `Swedesboro
  Brewing Company`, `Raccoon Pubhaus (formerly Third State)`, and `The Raccoon
  Taproom (Swedesboro Brewing)` share a domain but no name-stem, and a
  different-domain case (`Triumph Brewing Company`, Red Bank) is kept apart
  from the two `triumphbrew.com` locations despite the similar name. These
  ambiguous cases are left unmerged and open — see below.
- **`duplicate_record`** rows are dropped entirely, not modeled as a
  brewer/location/bridge row (e.g. the Cape May Brewing Company Cape May
  entry, which the source already says is the same single Rio Grande
  premises).
- **`moved_out_of_state`** rows get a `dim_brewer` row with
  `operating_status = moved_out_of_state`, but no current location and no
  `fact_newsletter_target` row.

## Known limitations (flagged, not resolved)

- **No street-address or OSM-id data.** `location_natural_key` is a
  brewer-scoped stopgap (`<brewer_natural_key>__<city-slug>`), not a true
  premises identity — the same real building could get two different
  `dim_location` rows if two unrelated brewers occupied it at different
  times. Real premises identity needs the `entity-resolution` skill and an
  OSM way/node id, per CLAUDE.md's gate.
- **Ambiguous shared-domain groups were left unmerged, not guessed at.** The
  Swedesboro Brewing family (3 locations, 1 shared domain, no shared name
  stem) and `Bonesaw Brewing Co.` / `Bonesaw Pilot House` (2 locations, 1
  shared domain, no shared stem) are each kept as separate
  `brewer_natural_key`s pending real research into whether they're one
  brand or several.
- **Toms River Brewing / Rinn Duin Brewing's site continuity is unverified**
  — carried forward from the original research note, and modeled as two
  separate `dim_location` rows rather than asserting continuity.
- **Border-cohort rows have no `date_added`** in the source data at all
  (every `border`-cohort row in `newsletter-targets.csv` has that column
  blank), so their `fact_newsletter_target.added_date` is blank too — not a
  bug, an honest gap.
- **Data contradiction found during restructuring, not resolved here:** the
  two closed New Jersey Iron Hill locations (Maple Shade, Voorhees) carry the
  note "whole Iron Hill chain closed," but the four border-cohort Iron Hill
  locations (Newark DE, Wilmington DE, Huntingdon Valley PA, North Wales PA)
  are still modeled as `is_current = true`, because nothing in the source
  data records their closure specifically. This needs a human decision, not
  an inferred one.
