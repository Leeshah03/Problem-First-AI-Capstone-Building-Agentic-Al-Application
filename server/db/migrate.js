import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './index.js';

export async function runMigrations() {
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './server/db/migrations' });
  console.log('Migrations complete.');
}

// Run directly
if (process.argv[1]?.endsWith('migrate.js')) {
  runMigrations()
    .then(() => pool.end())
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
