/**
 * Migration script for Neon PostgreSQL database
 * 
 * This script applies SQL migration files to the database in sequential order
 * based on their numeric prefix (e.g., 01_xxx.sql, 02_xxx.sql).
 * 
 * It creates a migrations table to track which migrations have been applied,
 * and only applies migrations that haven't been run yet.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, transaction } from '../db';

// Get the directory name (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory containing migration files
const MIGRATIONS_DIR = path.join(__dirname);

/**
 * Ensures the migrations table exists
 */
async function ensureMigrationsTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ Migrations table ready');
  } catch (err) {
    console.error('❌ Failed to create migrations table:', err);
    throw err;
  }
}

/**
 * Gets a list of all migration files ordered by their numeric prefix
 */
function getMigrationFiles() {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort(); // This will sort by the numeric prefix

  console.log(`📁 Found ${files.length} migration files`);
  return files;
}

/**
 * Gets a list of migrations that have already been applied
 */
async function getAppliedMigrations() {
  try {
    const result = await query('SELECT name FROM migrations');
    const appliedMigrations = result.rows.map(row => row.name);
    console.log(`ℹ️ ${appliedMigrations.length} migrations previously applied`);
    return appliedMigrations;
  } catch (err) {
    console.error('❌ Failed to get applied migrations:', err);
    throw err;
  }
}

/**
 * Applies a single migration file
 */
async function applyMigration(client: any, filename: string) {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  console.log(`🔄 Applying migration: ${filename}...`);
  
  try {
    // Execute the migration SQL
    await client.query(sql);
    
    // Record the migration in the migrations table
    await client.query(
      'INSERT INTO migrations (name) VALUES ($1)',
      [filename]
    );
    
    console.log(`✅ Applied migration: ${filename}`);
  } catch (err) {
    console.error(`❌ Failed to apply migration ${filename}:`, err);
    throw err;
  }
}

/**
 * Main function to run all pending migrations
 */
async function runMigrations() {
  try {
    // Ensure migrations table exists
    await ensureMigrationsTable();
    
    // Get all migration files
    const migrationFiles = getMigrationFiles();
    
    // Get list of already applied migrations
    const appliedMigrations = await getAppliedMigrations();
    
    // Filter out migrations that have already been applied
    const pendingMigrations = migrationFiles.filter(
      file => !appliedMigrations.includes(file)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('✨ No pending migrations to apply');
      return;
    }
    
    console.log(`🚀 Applying ${pendingMigrations.length} pending migrations...`);
    
    // Apply each pending migration in a transaction
    await transaction(async (client) => {
      for (const migrationFile of pendingMigrations) {
        await applyMigration(client, migrationFile);
      }
    });
    
    console.log('✨ All migrations applied successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

// Run migrations
runMigrations().then(() => {
  console.log('🏁 Migration process completed');
  process.exit(0);
}).catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
