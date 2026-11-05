import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { db, queryClient } from './client';
import { logger } from '@/lib/logger';

export async function runMigrations() {
  logger.info('Starting database migrations...');
  const directUrl = process.env.DIRECT_DATABASE_URL;
  let migrationDb = db;
  let customClient: postgres.Sql | null = null;

  if (directUrl && (directUrl.startsWith('postgres://') || directUrl.startsWith('postgresql://'))) {
    logger.info('Using DIRECT_DATABASE_URL for migrations (bypassing connection pooler)...');
    customClient = postgres(directUrl, { max: 1, prepare: false });
    migrationDb = drizzle(customClient) as any;
  }

  try {
    await migrate(migrationDb, { migrationsFolder: './drizzle' });
    logger.info('Database migrations applied successfully.');
  } catch (error) {
    logger.error({ err: error }, 'Migration failed');
    throw error;
  } finally {
    if (customClient) {
      await customClient.end();
    }
  }
}

if (process.argv[1]?.endsWith('migrate.ts')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
    .finally(async () => {
      await queryClient.end();
    });
}
