import { NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const dynamic = 'force-dynamic';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface MaintenanceStats {
  dbConnections: number;
  cacheSize: number;
  lastRun: string;
}

async function getMaintenanceStats(): Promise<MaintenanceStats> {
  const { rows: connections } = await pool.query(
    'SELECT count(*) as count FROM pg_stat_activity'
  );
  
  return {
    dbConnections: parseInt(connections[0].count),
    cacheSize: 0, // This will be populated by Cloudflare Worker
    lastRun: new Date().toISOString()
  };
}

async function performMaintenance() {
  // Vacuum analyze to optimize database
  await pool.query('VACUUM ANALYZE');
  
  // Clean up expired sessions
  await pool.query(`
    DELETE FROM sessions 
    WHERE expires_at < NOW() - INTERVAL '7 days'
  `);

  // Clean up old audit logs
  await pool.query(`
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '30 days'
  `);

  return await getMaintenanceStats();
}

export async function GET() {
  try {
    const stats = await performMaintenance();
    
    return NextResponse.json({
      success: true,
      message: 'Maintenance completed successfully',
      stats
    });
  } catch (error) {
    console.error('Maintenance error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Maintenance failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    // Ensure we always close the pool
    await pool.end();
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

