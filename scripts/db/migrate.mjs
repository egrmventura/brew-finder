// Applies db/migrations/*.sql in filename order, each file in its own transaction,
// recording applied files in public.schema_migrations. Re-running applies nothing new.
//
// Every run also:
//   - refuses a server whose PostGIS is older than MIN_POSTGIS, both the package on
//     disk (before migrating) and the extension and library in use (after);
//   - sets beerfinder_readonly's password from BEERFINDER_READONLY_PASSWORD, so
//     changing the variable takes effect without a new migration.
//
// Run through `pnpm db:migrate`, which loads .env via --env-file-if-exists.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { describeTarget, resolveDatabaseUrl } from "./database-url.mjs";

// 3.6.3 fixes a KNN failure (#6026) in the `<->` ordering that radius search
// depends on (geo-query-patterns skill). The postgis/postgis:18-3.6 tag moves, so
// a stale cached image could otherwise serve an older 3.6.x.
const MIN_POSTGIS = [3, 6, 3];

const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../db/migrations");

function fail(message) {
  console.error(`db:migrate: ${message}`);
  process.exit(1);
}

const { url: databaseUrl, source, error } = resolveDatabaseUrl();
if (error) fail(error);

const readonlyPassword = process.env.BEERFINDER_READONLY_PASSWORD;
if (!readonlyPassword) fail("BEERFINDER_READONLY_PASSWORD is not set. See .env.example.");

function versionAtLeast(version, min) {
  const parts = (version.match(/^\d+(\.\d+)*/)?.[0] ?? "").split(".").map(Number);
  for (let i = 0; i < min.length; i++) {
    const part = parts[i] ?? 0;
    if (part !== min[i]) return part > min[i];
  }
  return true;
}

function requirePostgis(label, version) {
  if (!versionAtLeast(version, MIN_POSTGIS)) {
    fail(
      `PostGIS ${label} is ${version}, older than ${MIN_POSTGIS.join(".")}. With Docker: ` +
        "`docker compose pull` and recreate the container. Otherwise upgrade the package and run " +
        "`ALTER EXTENSION postgis UPDATE`.",
    );
  }
}

// The extension in a database can lag the package on disk until
// ALTER EXTENSION ... UPDATE, and the loaded library is what actually runs, so
// both are checked. The function is schema-qualified from pg_extension: PostGIS
// may be installed outside search_path.
async function checkInstalledPostgis() {
  const { rows } = await client.query(
    `SELECT e.extversion, n.nspname
       FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
      WHERE e.extname = 'postgis'`,
  );
  if (rows.length === 0) return false;
  requirePostgis("extension", rows[0].extversion);
  let lib;
  try {
    ({ rows: lib } = await client.query(
      `SELECT ${client.escapeIdentifier(rows[0].nspname)}.postgis_lib_version() AS version`,
    ));
  } catch (err) {
    fail(
      `PostGIS ${rows[0].extversion} is installed but its library cannot load (${err.message}). ` +
        "With Docker: `docker compose pull` and recreate the container.",
    );
  }
  requirePostgis("library", lib[0].version);
  return true;
}

console.log(`db:migrate: target ${describeTarget(databaseUrl, source)}`);
let client;
try {
  // The constructor parses the URL and throws on a stray %.
  client = new pg.Client({ connectionString: databaseUrl });
} catch (err) {
  fail(`DATABASE_URL could not be parsed (${err.message}). Write a literal % as %25.`);
}
// Without a listener, a dropped connection is an unhandled 'error' event that
// crashes the process before the query rejections below can be reported.
// Those rejections carry the same error, so logging it here is enough.
client.on("error", (err) => console.error(`db:migrate: connection error: ${err.message}`));
try {
  await client.connect();
} catch (err) {
  fail(`cannot connect: ${err.message}. Is the database running? (\`pnpm db:up\`)`);
}

try {
  const { rows: available } = await client.query(
    "SELECT default_version FROM pg_available_extensions WHERE name = 'postgis'",
  );
  if (available.length === 0) fail("PostGIS is not available on this server.");
  requirePostgis("package", available[0].default_version);
  // Before migrating, so nothing is applied on a PostGIS the check would reject.
  // On a fresh database PostGIS is not installed yet; 0001 creates it and the
  // check below covers it.
  await checkInstalledPostgis();

  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      filename   text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
  const { rows } = await client.query("SELECT filename FROM public.schema_migrations");
  const applied = new Set(rows.map((r) => r.filename));

  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  const pending = files.filter((f) => !applied.has(f));
  if (pending.length === 0) {
    console.log(`db:migrate: nothing to apply (${files.length} already applied)`);
  }

  for (const file of pending) {
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO public.schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`db:migrate: applied ${file}`);
    } catch (err) {
      // If the connection is gone, ROLLBACK fails too; report the original error.
      const rolledBack = await client.query("ROLLBACK").then(
        () => "was rolled back",
        (rollbackErr) => `could not be rolled back (${rollbackErr.message})`,
      );
      fail(`${file} failed and ${rolledBack}: ${err.message}`);
    }
  }

  if (!(await checkInstalledPostgis())) fail("PostGIS is not installed in this database after migrating.");

  const { rows: role } = await client.query("SELECT 1 FROM pg_roles WHERE rolname = 'beerfinder_readonly'");
  if (role.length === 0) {
    // Roles are cluster-wide; a restore without roles leaves 0001 recorded but the role gone.
    fail(
      "beerfinder_readonly does not exist, although 0001 is recorded as applied. Delete its row from " +
        "public.schema_migrations and run db:migrate again.",
    );
  }
  // ALTER ROLE takes no bind parameters; escapeLiteral quotes the value safely.
  await client.query(`ALTER ROLE beerfinder_readonly PASSWORD ${client.escapeLiteral(readonlyPassword)}`);
  console.log("db:migrate: set beerfinder_readonly password");
} catch (err) {
  fail(err.message);
} finally {
  await client.end();
}
