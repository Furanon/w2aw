import { Pool } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Configure Neon connection for edge using existing DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const runtime = 'edge';

export async function GET() {
  try {
    // Example query using Neon in edge
    const { rows } = await pool.query('SELECT NOW()');
    
    // Get the client's geo information from Vercel's edge network
    const headersList = headers();
    const geo = {
      country: headersList.get('x-vercel-ip-country'),
      region: headersList.get('x-vercel-ip-country-region'),
      city: headersList.get('x-vercel-ip-city')
    };

    return NextResponse.json({
      success: true,
      serverTime: rows[0],
      geo,
      message: 'Edge function with Neon is working!'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Database connection failed' },
      { status: 500 }
    );
  }
}

