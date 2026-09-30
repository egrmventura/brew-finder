// One-off, manual loader for Open Brewery DB (Tier 1, docs/data-sources.md),
// filtered to New Jersey. NOT a scheduled job — there is no orchestration here
// and none is added; run it by hand when the NJ brewery snapshot needs a
// refresh:
//
//   node --env-file-if-exists=.env scripts/ingest/load_open_brewery_db.mjs
//
// Fetches from the public API (no auth), paginating defensively even though
// New Jersey currently fits on a single page (115 rows, 2026-09-30), and
// self-limits to 1 request/second between pages — the provider documents no
// rate limit, so this is our own conservative ceiling (docs/data-sources.md).
//
// Upserts into raw.open_brewery_db_breweries (db/migrations/0002) on the
// source's own `id`, so re-running is idempotent rather than duplicating
// rows. dbt's stg_obdb__breweries reads that table through source() only.
import pg from "pg";
import { describeTarget, resolveDatabaseUrl } from "../db/database-url.mjs";

const API_BASE = "https://api.openbrewerydb.org/v1/breweries";
const PER_PAGE = 200; // the API's documented max page size
const SELF_LIMIT_MS = 1000; // self-limit to 1 req/sec; see docs/data-sources.md

function fail(message) {
  console.error(`load_open_brewery_db: ${message}`);
  process.exit(1);
}

async function fetchAllNewJersey() {
  const rows = [];
  for (let page = 1; ; page++) {
    const url = `${API_BASE}?by_state=new_jersey&per_page=${PER_PAGE}&page=${page}`;
    let res;
    try {
      res = await fetch(url);
    } catch (err) {
      fail(`request to ${url} failed: ${err.message}`);
    }
    if (!res.ok) fail(`API request failed: ${res.status} ${res.statusText} (${url})`);
    const batch = await res.json();
    if (batch.length === 0) break;
    rows.push(...batch);
    if (batch.length < PER_PAGE) break;
    await new Promise((resolve) => setTimeout(resolve, SELF_LIMIT_MS));
  }
  return rows;
}

const { url: databaseUrl, source, error } = resolveDatabaseUrl();
if (error) fail(error);

console.log(`load_open_brewery_db: target ${describeTarget(databaseUrl, source)}`);

const fetched = await fetchAllNewJersey();

// Defensive: by_state=new_jersey is the API's own filter, but the dataset is
// worldwide (docs/data-sources.md notes a New Jersey could in principle exist
// outside the US), so keep only United States rows as a belt-and-suspenders
// check rather than trusting the filter alone.
const rows = fetched.filter((r) => r.country === "United States");
if (rows.length !== fetched.length) {
  console.log(`load_open_brewery_db: dropped ${fetched.length - rows.length} non-US row(s)`);
}
if (rows.length === 0) fail("API returned zero New Jersey, United States rows; refusing to load nothing.");

const client = new pg.Client({ connectionString: databaseUrl });
try {
  await client.connect();
} catch (err) {
  fail(`cannot connect: ${err.message}. Is the database running? (\`pnpm db:up\`)`);
}

try {
  await client.query("BEGIN");
  for (const r of rows) {
    await client.query(
      `INSERT INTO raw.open_brewery_db_breweries
         (id, name, brewery_type, address_1, address_2, address_3, city,
          state_province, postal_code, country, longitude, latitude, phone,
          website_url, state, street, _ingested_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, now())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         brewery_type = EXCLUDED.brewery_type,
         address_1 = EXCLUDED.address_1,
         address_2 = EXCLUDED.address_2,
         address_3 = EXCLUDED.address_3,
         city = EXCLUDED.city,
         state_province = EXCLUDED.state_province,
         postal_code = EXCLUDED.postal_code,
         country = EXCLUDED.country,
         longitude = EXCLUDED.longitude,
         latitude = EXCLUDED.latitude,
         phone = EXCLUDED.phone,
         website_url = EXCLUDED.website_url,
         state = EXCLUDED.state,
         street = EXCLUDED.street,
         _ingested_at = now()`,
      [
        r.id,
        r.name,
        r.brewery_type,
        r.address_1,
        r.address_2,
        r.address_3,
        r.city,
        r.state_province,
        r.postal_code,
        r.country,
        r.longitude,
        r.latitude,
        r.phone,
        r.website_url,
        r.state,
        r.street,
      ],
    );
  }
  await client.query("COMMIT");
  console.log(`load_open_brewery_db: loaded ${rows.length} row(s) into raw.open_brewery_db_breweries`);
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  fail(`load failed, rolled back: ${err.message}`);
} finally {
  await client.end();
}
