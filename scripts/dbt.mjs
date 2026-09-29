// Runs dbt-core from pipeline/.venv against the same Postgres db:migrate uses.
//
// Two guards, both from ADR-0006:
//   - Never the dbt on PATH. On a machine with the dbt Cloud CLI installed, that
//     is what `dbt` resolves to, and it needs a dbt Cloud account.
//   - One connection setting (scripts/db/database-url.mjs). dbt-postgres takes host,
//     user, and so on separately, so they are split out here into the DBT_PG_*
//     variables that pipeline/dbt/profiles.yml reads.
//
// Usage: node --env-file-if-exists=.env scripts/dbt.mjs <dbt args...>
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describeTarget, resolveDatabaseUrl } from "./db/database-url.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectDir = path.join(root, "pipeline/dbt");
const dbtBin = path.join(
  root,
  "pipeline/.venv",
  process.platform === "win32" ? "Scripts/dbt.exe" : "bin/dbt",
);

function fail(message) {
  console.error(`dbt: ${message}`);
  process.exit(1);
}

if (!existsSync(dbtBin)) {
  fail(
    "pipeline/.venv has no dbt. Create it with:\n" +
      "  python3 -m venv pipeline/.venv\n" +
      "  pipeline/.venv/bin/pip install -r pipeline/requirements.txt",
  );
}

// Read the venv's installed-package metadata rather than starting dbt: dbt-core
// and the adapter must be there, and the dbt Cloud CLI (PyPI package `dbt`) must not.
function installedPackages() {
  const venv = path.join(root, "pipeline/.venv");
  const lib = path.join(venv, "lib");
  const sitePackages =
    process.platform === "win32"
      ? [path.join(venv, "Lib/site-packages")]
      : existsSync(lib)
        ? readdirSync(lib)
            .filter((d) => d.startsWith("python"))
            .map((d) => path.join(lib, d, "site-packages"))
        : [];
  return sitePackages.filter(existsSync).flatMap((dir) => readdirSync(dir));
}
const packages = installedPackages();
if (packages.some((p) => /^dbt-\d.*\.dist-info$/.test(p))) {
  fail("pipeline/.venv has the dbt Cloud CLI (package `dbt`), not dbt-core (ADR-0006). Recreate it from pipeline/requirements.txt.");
}
for (const pkg of ["dbt_core", "dbt_postgres"]) {
  if (!packages.some((p) => p.startsWith(`${pkg}-`) && p.endsWith(".dist-info"))) {
    fail(`pipeline/.venv is missing ${pkg.replace("_", "-")}. Run: pipeline/.venv/bin/pip install -r pipeline/requirements.txt`);
  }
}

const { url: databaseUrl, source, error } = resolveDatabaseUrl();
if (error) fail(error);
console.error(`dbt: target ${describeTarget(databaseUrl, source)}`);

let url;
try {
  url = new URL(databaseUrl);
} catch {
  fail("DATABASE_URL is not a valid URL.");
}
if (!/^postgres(ql)?:$/.test(url.protocol)) fail("DATABASE_URL must start with postgres:// or postgresql://.");
// The profile takes host, port, user, password and dbname only. Anything else in the
// URL (sslmode, a socket path in ?host=, options) would reach db:migrate but not dbt,
// so the two would connect differently. Refuse rather than drop it silently.
if (url.search) {
  fail(`DATABASE_URL has query parameters (${url.search}) that dbt would not receive. Remove them or add them to pipeline/dbt/profiles.yml.`);
}

// Decoded the way pg-connection-string does for db:migrate, so both connect to the
// same place: decodeURIComponent for host, user and password, decodeURI for the
// database name. A stray `%` makes either throw; report it instead.
function decode(part, value, decoder = decodeURIComponent) {
  try {
    return decoder(value);
  } catch {
    fail(`DATABASE_URL ${part} has a % that is not percent-encoding. Write a literal % as %25.`);
  }
}

// new URL keeps IPv6 hosts in brackets ([::1]); libpq wants them bare.
const host = decode("host", url.hostname.replace(/^\[(.*)\]$/, "$1"));
if (!host || host.startsWith("/")) fail("DATABASE_URL has no TCP host. Socket-path connections are not supported for dbt.");

const env = {
  ...process.env,
  DBT_PG_HOST: host,
  DBT_PG_PORT: url.port || "5432",
  DBT_PG_USER: decode("user", url.username),
  DBT_PG_PASSWORD: decode("password", url.password),
  DBT_PG_DBNAME: decode("database name", url.pathname.replace(/^\//, ""), decodeURI),
};
const projectArgs = ["--project-dir", projectDir, "--profiles-dir", projectDir];

function runDbt(args, options) {
  const result = spawnSync(dbtBin, [...args, ...projectArgs], { env, ...options });
  if (result.error) {
    // e.g. ENOENT when the Python the venv was built with has since been removed.
    fail(`could not run ${dbtBin}: ${result.error.message}. Recreate pipeline/.venv (see README, Setup).`);
  }
  return result;
}

// With no models, `dbt run` and `dbt test` exit 0 having done nothing, and so does
// `dbt test` when models exist but none has a test: a pass on nothing, which
// CLAUDE.md § Commands forbids. Fail instead, as scripts/require-workspace-script.mjs
// does for `pnpm test`. dbt itself lists what exists (enabled nodes only, any
// language, tests from any yml or tests/), in one parse, rather than guessing from files.
function countNodes() {
  const result = runDbt(
    ["ls", "--quiet", "--resource-type", "model", "--resource-type", "test", "--resource-type", "unit_test",
      "--output", "json", "--output-keys", "resource_type"],
    { encoding: "utf8" },
  );
  if (result.status !== 0) fail(`\`dbt ls\` failed, so the pass-on-nothing guard cannot run:\n${result.stdout}${result.stderr}`);
  const counts = { model: 0, test: 0 };
  for (const line of result.stdout.split("\n")) {
    if (!line.trim().startsWith("{")) continue;
    const type = JSON.parse(line).resource_type;
    if (type === "model") counts.model++;
    else counts.test++; // test, unit_test
  }
  return counts;
}
const command = process.argv[2];
if (["run", "test", "build"].includes(command)) {
  const counts = countNodes();
  if (counts.model === 0) {
    fail(`pipeline/dbt has no enabled models, so \`dbt ${command}\` has nothing to do. Failing rather than passing on nothing.`);
  }
  if (command === "test" && counts.test === 0) {
    fail("pipeline/dbt has models but no tests, so `dbt test` has nothing to check. Failing rather than passing on nothing.");
  }
}

const result = runDbt(process.argv.slice(2), { stdio: "inherit" });
process.exit(result.status ?? 1);
