require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_LlSW3hAevE9u@ep-sparkling-band-a1263rko-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false // Required for some connections to Neon
  }
});

async function runMigration() {
  // SQL for creating the notifications table
  const createNotificationsTable = `
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      message TEXT NOT NULL,
      listing_id TEXT,
      read_status BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Add index for faster queries on user_id
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
    
    -- Add index for listing_id if many queries will filter by this
    CREATE INDEX IF NOT EXISTS idx_notifications_listing_id ON notifications (listing_id);
  `;

  const client = await pool.connect();
  
  try {
    console.log('Starting migration: Creating notifications table...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Execute the migration
    await client.query(createNotificationsTable);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Migration successful: Notifications table created');
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
    
    // Close the pool to end the process
    await pool.end();
  }
}

// Run the migration
runMigration().catch(err => {
  console.error('Error running migration:', err);
  process.exit(1);
});

