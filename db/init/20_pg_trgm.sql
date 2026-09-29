-- Runs once, on an empty data volume, after the image's 10_postgis.sh.
-- Connected to $POSTGRES_DB as the superuser.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
