import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });

// Helper to manage connections
export async function withConnection<T>(callback: () => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    return await callback();
  } finally {
    client.release();
  }
}
