import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

let cachedPool: Pool | null = null;
let cachedDb: NodePgDatabase | null = null;

function resolveDb(): NodePgDatabase {
  if (cachedDb) return cachedDb;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required for library features. Add a PostgreSQL connection string in your deployment's environment variables (e.g. Vercel → Project Settings → Environment Variables)."
    );
  }

  cachedPool =
    globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({ connectionString: databaseUrl });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = cachedPool;
  }

  cachedDb = drizzle(cachedPool);
  return cachedDb;
}

/**
 * Lazy Drizzle client.
 *
 * IMPORTANT: this module must NEVER throw at import time. Hosts such as
 * Vercel evaluate every server chunk during the build ("collecting page
 * data"); a top-level `throw` when DATABASE_URL is absent aborts the entire
 * build (the exact failure previously seen as
 * "Error: DATABASE_URL is required … Failed to collect page data for /").
 *
 * The Proxy defers resolution to first use. Every call site is already
 * wrapped in try/catch, so a missing DATABASE_URL simply degrades library
 * persistence instead of crashing the app or the build.
 */
export const db: NodePgDatabase = new Proxy({} as NodePgDatabase, {
  get(_target, prop) {
    const instance = resolveDb() as unknown as Record<PropertyKey, unknown>;
    const value = instance[prop];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

/** Lazily-resolved connection pool (same contract as `db`). */
export const pool: Pool = new Proxy({} as Pool, {
  get(_target, prop) {
    resolveDb(); // validates env + creates pool
    const instance = cachedPool as unknown as Record<PropertyKey, unknown>;
    const value = instance[prop];
    return typeof value === "function" ? value.bind(cachedPool) : value;
  },
});
