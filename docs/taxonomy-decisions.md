# Decision index

Every ADR in [`docs/adr/`](./adr/). An ADR wins where it disagrees with `PLAN.md` or `CLAUDE.md`, because ADRs are dated and represent later thinking. Add a row whenever an ADR is written or changes status; a superseded ADR keeps its row with its new status.

| ADR | Title | Status | Decides |
| --- | --- | --- | --- |
| [ADR-0001](./adr/0001-non-commercial-free-sources-only.md) | Non-commercial scope, free sources only | Accepted | No revenue of any kind. Only free sources any self-hoster can use. BeerMenus, Untappd, and partner and paid APIs are permanently out. Observations come from manual logging and newsletters |
| [ADR-0002](./adr/0002-remove-bjcp-ttb-and-keyword-facets.md) | Remove BJCP; styles from TTB class/type plus a keyword-to-facet map | Accepted | No BJCP content enters the repo. Styles are TTB class/type plus a hand-maintained keyword map onto the project's own facet vocabulary |
| [ADR-0003](./adr/0003-nj-retail-national-beer-scope.md) | New Jersey retail scope, national beer and brewer scope | Accepted | Outlets are NJ-only statewide; beers and brewers are national. Footprint is one three-valued NJ flag per brand, behind `distribution_footprint(brand, state_code)` |
| [ADR-0004](./adr/0004-outlet-sourcing-abc-registry-and-osm.md) | Outlet sourcing: NJ ABC licensee registry as spine, OpenStreetMap as enrichment, Google Places excluded | Accepted | The ABC registry defines which outlets exist. OSM supplies coordinates and hours and cross-checks the registry. Google Places is excluded because its terms prohibit storing its content |
| [ADR-0005](./adr/0005-release-data-public-dataset-repo.md) | Brewery release data in a separate public dataset repository | Accepted | Newsletters are processed once, from one inbox, into a public dataset repo updated by scheduled Actions. The app consumes it as a Tier 1 source |
| [ADR-0006](./adr/0006-dbt-core-against-postgres.md) | dbt-core runs directly against Postgres, not DuckDB | Accepted | The pipeline uses dbt-core with the Postgres adapter against the serving Postgres. No DuckDB, and no dbt Cloud CLI |
