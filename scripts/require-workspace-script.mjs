// Fail when no workspace package defines the named script.
//
// `pnpm -r test` exits 0 when no package has a `test` script, which reports a pass on nothing.
// CLAUDE.md § Commands forbids that: a check with nothing to check must fail, not go green.
// Usage: node scripts/require-workspace-script.mjs <script-name>

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const name = process.argv[2];
if (!name) {
  console.error("usage: require-workspace-script.mjs <script-name>");
  process.exit(2);
}

const projects = JSON.parse(
  execFileSync("pnpm", ["ls", "-r", "--depth", "-1", "--json"], { encoding: "utf8" }),
);
const root = process.cwd();
const withScript = projects.filter(({ path }) => {
  if (path === root) return false;
  const pkg = JSON.parse(readFileSync(join(path, "package.json"), "utf8"));
  return Boolean(pkg.scripts?.[name]);
});

if (withScript.length === 0) {
  console.error(`No workspace package defines a "${name}" script, so there is nothing to check. Failing rather than passing on nothing.`);
  process.exit(1);
}
