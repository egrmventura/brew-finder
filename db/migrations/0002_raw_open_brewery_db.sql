-- Raw landing schema, and the first table in it: Open Brewery DB breweries.
--
-- `raw` holds data exactly as fetched, before any staging-layer renaming or
-- casting. It is loaded by one-off scripts under scripts/ingest/ (manual for
-- now, not a scheduled job), never by dbt. dbt's stg_obdb__breweries reads it
-- through source() only.
--
-- Column names and types mirror the API's own response (docs/data-sources.md,
-- Open Brewery DB entry, confirmed against a live fetch on 2026-09-30):
-- id,name,brewery_type,address_1,address_2,address_3,city,state_province,
-- postal_code,country,longitude,latitude,phone,website_url,state,street.
-- `state` and `street` are the API's own duplicates of `state_province` and
-- `address_1`; they are kept here because this is a raw landing table, and
-- dropped in staging.
CREATE SCHEMA IF NOT EXISTS raw;
GRANT USAGE ON SCHEMA raw TO beerfinder_readonly;

CREATE TABLE IF NOT EXISTS raw.open_brewery_db_breweries (
  id             text PRIMARY KEY,
  name           text,
  brewery_type   text,
  address_1      text,
  address_2      text,
  address_3      text,
  city           text,
  state_province text,
  postal_code    text,
  country        text,
  longitude      double precision,
  latitude       double precision,
  phone          text,
  website_url    text,
  state          text,
  street         text,
  _ingested_at   timestamptz NOT NULL DEFAULT now()
);
