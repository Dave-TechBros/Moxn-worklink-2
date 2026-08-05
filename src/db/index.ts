import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const PoolClass = pg?.Pool || (pg as any)?.default?.Pool;

// Serverless platforms run many concurrent function instances, and managed
// Postgres (Prisma Postgres, Neon, Supabase) caps total connections per
// project. A small per-instance pool prevents exhausting the database.
const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const POOL_MAX = IS_SERVERLESS ? 3 : 10;

declare global {
  var _postgresPool: pg.Pool | undefined;
  var _drizzleInstance: any | undefined;
}

// True when ANY database configuration is present. Accepts both the standard
// connection-string form (DATABASE_URL / POSTGRES_URL / PRISMA_DATABASE_URL)
// and the split-out SQL_* form (SQL_HOST, SQL_USER, ...).
export const isPgConfigured = (): boolean => {
  return Boolean(
    process.env.SQL_HOST ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.PRISMA_DATABASE_URL
  );
};

// Ordered list of connection-string env vars to try. Plain postgres URLs
// (DATABASE_URL / POSTGRES_URL) are preferred because they work directly with
// node-postgres; PRISMA_DATABASE_URL is used last because it may use the
// "prisma+postgres://" scheme (handled below).
const CONNECTION_URL_VARS = ['DATABASE_URL', 'POSTGRES_URL', 'PRISMA_DATABASE_URL'];

// Prisma Postgres connection strings use a "prisma+postgres://" prefix that
// node-postgres cannot parse. Everything after the scheme is a standard
// postgres URI, so strip the "prisma+" marker to get a usable URL. URLs using
// the "prisma://" scheme (Prisma Accelerator / Prisma Postgres proxy) speak a
// proprietary protocol and cannot be used by node-postgres at all — those are
// skipped.
const normalizeConnectionUrl = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (trimmed.startsWith('prisma+postgres://')) {
    return trimmed.replace(/^prisma\+postgres:\/\//i, 'postgresql://');
  }
  if (trimmed.startsWith('prisma://')) {
    return null;
  }
  return trimmed;
};

const resolveConnectionUrl = (): string | null => {
  for (const key of CONNECTION_URL_VARS) {
    const raw = process.env[key];
    if (raw) {
      const normalized = normalizeConnectionUrl(raw);
      if (normalized) return normalized;
      console.warn(`[DB] ${key} uses an unsupported scheme; trying the next configured connection string.`);
    }
  }
  return null;
};

// True only when there is a connection node-postgres can actually use: either a
// real postgres connection string (DATABASE_URL / POSTGRES_URL / a
// prisma+postgres:// PRISMA_DATABASE_URL) or a split SQL_* config. A bare
// prisma:// URL is present-but-unusable, so it must NOT enable "DB mode" —
// otherwise every query fails and the app silently falls back to the ephemeral
// per-instance memory store while health reports a healthy PostgreSQL.
export const hasUsablePgConfig = (): boolean => {
  if (process.env.SQL_HOST) return true;
  for (const key of CONNECTION_URL_VARS) {
    const raw = process.env[key];
    if (raw && normalizeConnectionUrl(raw)) return true;
  }
  return false;
};

// Redacted diagnostic: reports only the scheme (never the credentials) of each
// configured connection string so /api/health can show why a deployment is or
// is not using the database.
export const getDbConfigDiagnostics = (): Record<string, string | null> => {
  const schemes: Record<string, string | null> = {};
  for (const key of CONNECTION_URL_VARS) {
    const raw = process.env[key];
    schemes[key] = raw ? (raw.match(/^([a-zA-Z+]+):\/\//)?.[1] || 'unknown') : null;
  }
  schemes.SQL_HOST = process.env.SQL_HOST ? 'split-config' : null;
  return schemes;
};

export const createPool = () => {
  if (!PoolClass || !hasUsablePgConfig()) {
    return null;
  }
  if (!global._postgresPool) {
    try {
      const connectionUrl = resolveConnectionUrl();

      if (connectionUrl) {
        const parsed = new URL(connectionUrl);
        // Honour sslmode if present; otherwise default to TLS with relaxed
        // cert validation (typical for managed/hosted Postgres).
        const sslmode = parsed.searchParams.get('sslmode');
        const ssl =
          sslmode === 'disable' || sslmode === 'allow' || sslmode === 'prefer'
            ? false
            : { rejectUnauthorized: false };
        // Strip query params node-postgres does not understand.
        parsed.search = '';

        global._postgresPool = new PoolClass({
          connectionString: parsed.toString(),
          ssl,
          max: POOL_MAX,
          connectionTimeoutMillis: 15000,
        });
      } else if (process.env.SQL_HOST) {
        global._postgresPool = new PoolClass({
          host: process.env.SQL_HOST,
          user: process.env.SQL_USER,
          password: process.env.SQL_PASSWORD,
          database: process.env.SQL_DB_NAME,
          port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432,
          ssl: process.env.SQL_SSL === 'false' ? false : { rejectUnauthorized: false },
          max: POOL_MAX,
          connectionTimeoutMillis: 15000,
        });
      } else {
        // Env vars are present but none is usable (e.g. only a prisma:// URL
        // that node-postgres cannot connect to). Do not build a pool against
        // localhost defaults — leave it unset so the app runs in memory mode
        // instead of failing every query.
        return null;
      }

      global._postgresPool.on('error', (err) => {
        console.error('Unexpected error on idle SQL pool client:', err);
      });
    } catch (err) {
      console.error('Failed to create PostgreSQL pool:', err);
      return null;
    }
  }
  return global._postgresPool;
};

export const getDb = () => {
  if (!global._drizzleInstance) {
    const pool = createPool();
    if (!pool) return null;
    global._drizzleInstance = drizzle(pool, { schema });
  }
  return global._drizzleInstance;
};

let schemaReady: Promise<boolean> | null = null;

// ---------------------------------------------------------------------------
// Auto-schema creation. Serverless deploys (Vercel) create the database
// connection lazily and run zero migrations, so without this the pg-* layer
// would throw "relation does not exist" on the first request and silently fall
// back to the ephemeral memory store.
//
// The DDL is generated directly from the drizzle schema objects so the created
// tables always match exactly what the ORM queries — hand-written DDL drifts
// out of sync and breaks every statement with "column does not exist".
// ---------------------------------------------------------------------------

const drizzleTableName = Symbol.for('drizzle:Name') as any;
const drizzleColumns = Symbol.for('drizzle:Columns') as any;

const ddlType = (columnType: string): string => {
  switch (columnType) {
    case 'PgJsonb':
      return 'jsonb';
    case 'PgInteger':
      return 'integer';
    case 'PgBoolean':
      return 'boolean';
    case 'PgTimestamp':
    case 'PgTimestampWithTimezone':
      return 'timestamp';
    case 'PgDoublePrecision':
    case 'PgNumeric':
      return 'numeric';
    default:
      return 'text';
  }
};

// Renders a column DEFAULT clause from a drizzle default value (or sql).
const ddlDefault = (value: any): string | null => {
  if (value === undefined || value === null) return null;
  // sql`` helper or raw sql instance
  if (value?.queryChunks || value?.getSQL || value?.config) {
    const sql = value.getSQL ? value.getSQL() : value;
    if (sql?.queryChunks) {
      const chunk = sql.queryChunks[0];
      if (typeof chunk === 'string') return chunk;
    }
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`;
  }
  if (Array.isArray(value) || (typeof value === 'object')) {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return null;
};

const buildCreateTable = (table: any): string => {
  const tableName = table[drizzleTableName];
  const cols = table[drizzleColumns];
  const parts: string[] = [];
  const primaryKeys: string[] = [];

  for (const key of Object.keys(cols)) {
    const col = cols[key];
    let def = `"${col.name}" ${ddlType(col.columnType)}`;
    if (col.notNull) def += ' NOT NULL';
    const defClause = ddlDefault(col.default);
    if (defClause) def += ` DEFAULT ${defClause}`;
    if (col.primary) primaryKeys.push(`"${col.name}"`);
    parts.push(def);
  }

  if (primaryKeys.length > 0) {
    parts.push(`PRIMARY KEY (${primaryKeys.join(', ')})`);
  }

  return `CREATE TABLE IF NOT EXISTS "${tableName}" (${parts.join(', ')})`;
};

export const ensureSchema = (): Promise<boolean> => {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    const instance = getDb();
    if (!instance) return false;
    const pool = createPool();
    if (!pool) return false;
    const client = await pool.connect();
    try {
      for (const table of Object.values(schema) as any[]) {
        if (!table || !table[drizzleTableName]) continue;
        await client.query(buildCreateTable(table));
        // Existing tables may predate newer columns (e.g. the users table was
        // created before admin_level/status/verified/last_login_at existed).
        // CREATE TABLE IF NOT EXISTS is a no-op for them, so add any missing
        // columns idempotently instead of leaving the ORM unable to read/write
        // fields the rest of the app depends on.
        await ensureColumns(client, table);
      }
      return true;
    } catch (err) {
      console.error('Failed to ensure SQL schema:', err);
      return false;
    } finally {
      client.release();
    }
  })();
  return schemaReady;
};

// Adds columns that exist in the drizzle schema but are missing from the actual
// table. Checks information_schema so repeated cold starts never try to add a
// column that already exists.
const ensureColumns = async (client: any, table: any): Promise<void> => {
  const tableName = table[drizzleTableName];
  const cols = table[drizzleColumns];

  const existingResult = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
    [tableName]
  );
  const existing = new Set((existingResult.rows || []).map((r: any) => r.column_name));

  for (const key of Object.keys(cols)) {
    const col = cols[key];
    if (existing.has(col.name)) continue;
    let def = `"${col.name}" ${ddlType(col.columnType)}`;
    if (col.notNull) def += ' NOT NULL';
    const defClause = ddlDefault(col.default);
    if (defClause) def += ` DEFAULT ${defClause}`;
    await client.query(`ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS ${def}`);
    console.log(`[DB] Added missing column "${tableName}.${col.name}"`);
  }
};

// Safe Proxy for db exports so top-level imports won't crash when SQL_HOST is omitted
export const db = new Proxy({} as any, {
  get(_target, prop) {
    if (
      prop === 'then' ||
      prop === 'catch' ||
      prop === 'finally' ||
      prop === 'toJSON' ||
      prop === 'constructor' ||
      typeof prop === 'symbol'
    ) {
      return undefined;
    }
    const instance = getDb();
    if (!instance) {
      return () => {
        throw new Error("Cloud SQL database is not configured (SQL_HOST missing).");
      };
    }
    const val = (instance as any)[prop];
    return typeof val === 'function' ? val.bind(instance) : val;
  }
});

export { schema };
