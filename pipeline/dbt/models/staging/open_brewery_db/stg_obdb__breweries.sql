-- Staging: Open Brewery DB breweries, New Jersey, United States only (the
-- ingest that populates raw.open_brewery_db_breweries already filters to that
-- scope — see scripts/ingest/load_open_brewery_db.mjs).
--
-- Rename to snake_case conventions and cast types only, per the staging rules
-- in the dbt-conventions skill: no joins, no filtering of business rows, no
-- logic. `state` and `street` are the source's own exact duplicates of
-- `state_province` and `address_1` (confirmed in docs/data-sources.md) and are
-- dropped here rather than carried forward as redundant columns.
--
-- No row-level dedupe: raw.open_brewery_db_breweries has `id` as its primary
-- key and the loader upserts on it, so at most one row per id already exists
-- upstream of this model.

with source as (

    select * from {{ source('open_brewery_db', 'open_brewery_db_breweries') }}

),

renamed as (

    select
        id                                 as brewery_id,
        name                                as brewery_name,
        brewery_type,
        address_1                          as address_line_1,
        address_2                          as address_line_2,
        address_3                          as address_line_3,
        city,
        state_province,
        postal_code,
        country,
        cast(longitude as numeric)         as longitude,
        cast(latitude as numeric)          as latitude,
        phone,
        website_url,
        cast(_ingested_at as timestamptz)  as ingested_at

    from source

)

select * from renamed
