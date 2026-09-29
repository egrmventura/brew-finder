// One connection setting for db:migrate and dbt.
//
// DATABASE_URL wins when set (a Postgres not run by docker compose). When unset,
// it is built from the POSTGRES_* values docker-compose.yml already uses, so the
// port and credentials live in one place.
//
// Docker Compose and Node's --env-file parse .env differently: Node cuts a value
// at `#`, Compose interpolates `$name`. A POSTGRES_* value containing either would
// create the container with one password and connect with another. Other
// punctuation is percent-encoded into the URL and decoded differently per part.
// Only characters that pass through all of that unchanged are accepted.
const UNSAFE = /[^A-Za-z0-9._-]/;

export function resolveDatabaseUrl(env = process.env) {
  if (env.DATABASE_URL) return { url: env.DATABASE_URL, source: "DATABASE_URL" };

  const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } = env;
  if (!POSTGRES_USER || !POSTGRES_PASSWORD || !POSTGRES_DB) return { error: MISSING_URL_MESSAGE };

  for (const [name, value] of Object.entries({ POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB })) {
    if (UNSAFE.test(value)) {
      return {
        error: `${name} may contain only letters, digits, and - _ . (Docker Compose and Node read other characters in .env differently).`,
      };
    }
  }

  // 127.0.0.1, not localhost: compose publishes the port on IPv4 loopback only,
  // and localhost may resolve to ::1 first.
  const port = env.POSTGRES_PORT || "5432";
  const user = encodeURIComponent(POSTGRES_USER);
  const password = encodeURIComponent(POSTGRES_PASSWORD);
  return {
    url: `postgres://${user}:${password}@127.0.0.1:${port}/${encodeURIComponent(POSTGRES_DB)}`,
    source: "POSTGRES_*",
  };
}

// For logs: where a URL points, without its password. Makes a DATABASE_URL
// inherited from the shell visible before anything is written through it.
export function describeTarget(url, source) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return `an unparseable URL (from ${source})`;
  }
  // Shown as written: a stray % would make decodeURIComponent throw.
  return `${u.hostname}:${u.port || "5432"}${u.pathname} as ${u.username} (from ${source})`;
}

const MISSING_URL_MESSAGE =
  "no database configured. Copy .env.example to .env: set POSTGRES_USER, POSTGRES_PASSWORD and POSTGRES_DB, or DATABASE_URL.";
