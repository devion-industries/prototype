import { readFileSync } from 'fs';
import { join } from 'path';
import db from './client';

async function runMigrations() {
  console.log('🔄 Running database migrations...');

  try {
    const migrationPath = join(__dirname, 'migrations', '001_initial_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    await db.query(migrationSQL);

    console.log('✅ Migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();


