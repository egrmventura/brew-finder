-- Extensions and the read-only role.
--
-- The Docker init scripts already create postgis and pg_trgm; repeating them here
-- covers self-hosters who run Postgres without Docker. Needs a role allowed to
-- create extensions and roles (the compose POSTGRES_USER is a superuser).
--
-- The role's password is not set here. scripts/db/migrate.mjs sets it from
-- BEERFINDER_READONLY_PASSWORD on every run, so changing the variable takes effect.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- beerfinder_readonly: SELECT only, for review sessions and future MCP use.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'beerfinder_readonly') THEN
    CREATE ROLE beerfinder_readonly LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
  END IF;
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO beerfinder_readonly', current_database());
  -- PUBLIC gets TEMP on every database by default; take it back here so the role
  -- cannot create temp tables. The owner keeps TEMP through ownership. CONNECT is
  -- left with PUBLIC: revoking it is a cluster-wide decision, not this project's.
  EXECUTE format('REVOKE TEMPORARY ON DATABASE %I FROM PUBLIC', current_database());
END
$$;

-- A guard against accidental writes, not a security boundary: the role can turn
-- this default off in its own session. What stops writes is that it holds no
-- INSERT/UPDATE/DELETE/CREATE privilege anywhere.
ALTER ROLE beerfinder_readonly SET default_transaction_read_only = on;

GRANT USAGE ON SCHEMA public TO beerfinder_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO beerfinder_readonly;
REVOKE CREATE ON SCHEMA public FROM beerfinder_readonly;

-- Tables the migrating role creates later, in any schema, are readable too.
-- Schema USAGE for schemas dbt creates is granted by dbt's on-run-end hook.
ALTER DEFAULT PRIVILEGES GRANT SELECT ON TABLES TO beerfinder_readonly;
