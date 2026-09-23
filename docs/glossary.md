# Glossary

Domain terms and the abbreviations permitted in names. The `dimensional-grain` skill allows no abbreviation in a table or column name beyond those defined here.

**bbl** — US beer barrel, 31 US gallons. The unit of brewery production volume, used in `annual_bbl_estimate` and in the Brewers Association's 6,000,000 bbl "small brewer" threshold.

**COLA** — Certificate of Label Approval. TTB's approval of an alcohol beverage label. The public COLA Registry lists approved malt beverage labels nationally and is the source for `dim_beer`.

**Confidence band** — The user-facing presentation of an availability score: `Very likely`, `Usually stocked`, `Sometimes`, or `Call ahead`, always shown with the last observation date. It is never a stock claim (CLAUDE.md constraint 2).

**Conformed dimension** — A dimension with one definition shared by several fact tables, so facts can be queried together through it. `dim_outlet` is conformed across retailers and brewery taprooms, so one geo query covers both.

**Control state** — A state where the government holds a monopoly on the wholesale or retail sale of some alcoholic beverages. In practice this is mostly spirits; beer almost everywhere flows through private retail (`PLAN.md` §3).

**Distribution footprint** — Whether a brand is legally distributed in a state. Here it is one New Jersey flag per brand with three values: distributed, not distributed, or unknown (ADR-0003). It is the dominant term in the scoring function.

**Grain** — What one row of a table represents, written "one row per ___". Every fact table declares it in a `Grain:` comment and, identically, in `docs/architecture.md`.

**GTIN** — Global Trade Item Number. The GS1 product identifier behind retail barcodes; a UPC is a 12-digit GTIN. It is a natural key on `dim_beer` where available.

**Outlet archetype** — The kind of store an outlet is, recorded as `outlet_type`: bottle shop, supermarket, convenience, brewery taproom, and so on. It drives the `outlet_archetype_affinity` scoring term, and its weights are fitted on New Jersey, where licensing sorts outlets cleanly. They don't transfer to other states without re-fitting.

**SCD2** — Slowly Changing Dimension, Type 2. History is kept by adding a new row for each change, bounded by `effective_from`, `effective_to`, and `is_current`. `dim_brewer` is SCD2 because ownership changes decide the independence axis.

**Three-tier** — The US system separating producers, distributors, and retailers, mandated in most states. This project is none of the three and facilitates no transactions (CLAUDE.md constraint 6).

**TTB** — Alcohol and Tobacco Tax and Trade Bureau, part of the US Treasury. It approves labels (COLA), issues Brewer's Notices, and defines the class/type designations in 27 CFR Part 7 that form the project's style base layer (ADR-0002).
