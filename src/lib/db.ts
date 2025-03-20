import { Pool } from 'pg';

// Create a new PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false,
});

// Export the query method directly
export const query = (text: string, params?: any[]) => pool.query(text, params);

// Export a transaction function that handles begin/commit/rollback
export const transaction = async <T>(callback: (client: any) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Export the pool for direct access if needed
export default pool;

// Ensure the database schema is set up correctly
export async function ensureTablesExist() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS places_cache (
        cache_key TEXT PRIMARY KEY,
        response_data JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS places_activities (
        id SERIAL PRIMARY KEY,
        place_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        vicinity TEXT,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        rating REAL,
        types TEXT[],
        photos JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS places_activities_location_idx 
      ON places_activities USING GIST (
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
      );
    `);    
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        message TEXT NOT NULL,
        read_status BOOLEAN DEFAULT FALSE,
        listing_id TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS notifications_user_id_idx 
      ON notifications(user_id);
    `);
    
    console.log('Database tables created or already exist');
    
    console.log('Database tables created or already exist');
  } catch (error) {
    console.error('Error ensuring database tables exist:', error);
    throw error;
  }
}
