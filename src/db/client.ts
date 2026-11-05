import fs from 'fs';
import path from 'path';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import postgres from 'postgres';
import { PGlite } from '@electric-sql/pglite';
import * as schema from './schema';
import { env } from '@/lib/env';

const usePglite =
  process.env.USE_PGLITE === 'true' ||
  (env.DATABASE_URL && env.DATABASE_URL.startsWith('pglite://'));

const globalForDb = globalThis as unknown as {
  queryClient?: postgres.Sql;
  pgliteClient?: PGlite;
};

let queryClient: any;
let db: ReturnType<typeof drizzlePostgres<typeof schema>>;

if (usePglite) {
  const pglitePath = env.DATABASE_URL.startsWith('pglite://')
    ? env.DATABASE_URL.replace('pglite://', '')
    : './data/pglite';

  // In development, remove any abandoned lock from previous killed dev sessions
  try {
    const pidFile = path.resolve(process.cwd(), pglitePath, 'postmaster.pid');
    if (fs.existsSync(pidFile)) {
      fs.unlinkSync(pidFile);
    }
  } catch {}

  const client = globalForDb.pgliteClient || new PGlite(pglitePath);
  if (env.NODE_ENV !== 'production') {
    globalForDb.pgliteClient = client;
  }

  queryClient = {
    end: async () => await client.close(),
  };

  db = drizzlePglite(client, { schema }) as unknown as ReturnType<
    typeof drizzlePostgres<typeof schema>
  >;
} else {
  const isServerless = !!process.env.VERCEL || process.env.NEXT_RUNTIME === 'edge';
  const connectionUrl =
    env.DATABASE_URL.startsWith('postgres://') || env.DATABASE_URL.startsWith('postgresql://')
      ? env.DATABASE_URL
      : 'postgres://postgres:postgres@127.0.0.1:5432/qr_ordering';

  queryClient =
    globalForDb.queryClient ||
    postgres(connectionUrl, {
      max: isServerless ? 1 : (env.NODE_ENV === 'production' ? 20 : 10),
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false, // Essential for Neon/Supabase transaction connection poolers (PgBouncer)
    });

  if (env.NODE_ENV !== 'production' || isServerless) {
    globalForDb.queryClient = queryClient;
  }

  db = drizzlePostgres(queryClient, { schema });
}

export { db, queryClient };
