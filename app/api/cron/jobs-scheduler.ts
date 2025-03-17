import { NextResponse } from 'next/server';
import { createProducer } from '../../../lib/kafka.js';
import { 
  processMaintenanceJob, 
  MaintenanceJobType 
} from '../../../jobs/maintenance/index';
import { 
  submitAnalyticsJob,
  createAnalyticsProducer
} from '../../../jobs/analytics/index';

interface JobScheduleItem {
  jobType: string;
  handler: () => Promise<any>;
  description: string;
}

/**
 * Execute a maintenance job directly
 */
async function executeMaintenanceJob(jobType: MaintenanceJobType): Promise<any> {
  const jobId = `scheduled-${jobType}-${Date.now()}`;
  
  const job = {
    id: jobId,
    type: jobType,
    payload: {
      scheduledAt: new Date().toISOString(),
      source: 'vercel-cron'
    },
    createdAt: new Date().toISOString(),
    priority: 'medium' as const
  };
  
  console.log(`Executing scheduled maintenance job: ${jobType}`);
  return processMaintenanceJob(job);
}

/**
 * Submit an analytics job via Kafka
 */
async function submitScheduledAnalyticsJob(jobType: string, data: any): Promise<void> {
  const producer = await createAnalyticsProducer();
  
  try {
    await submitAnalyticsJob(
      producer, 
      jobType as any, 
      {
        ...data,
        scheduledAt: new Date().toISOString(),
        source: 'vercel-cron'
      }
    );
    console.log(`Scheduled analytics job submitted: ${jobType}`);
  } finally {
    await producer.disconnect();
  }
}

/**
 * Daily jobs to run once per day (typically during off-peak hours)
 */
const dailyJobs: JobScheduleItem[] = [
  {
    jobType: 'database-optimization',
    handler: async () => executeMaintenanceJob(MaintenanceJobType.DATABASE_OPTIMIZATION),
    description: 'Optimize database performance'
  },
  {
    jobType: 'data-cleanup',
    handler: async () => executeMaintenanceJob(MaintenanceJobType.DATA_CLEANUP),
    description: 'Clean up old or temporary data'
  },
  {
    jobType: 'daily-analytics',
    handler: async () => submitScheduledAnalyticsJob('METRICS_CALCULATION', { 
      period: 'daily',
      metrics: ['user_activity', 'conversions', 'performance']
    }),
    description: 'Generate daily analytics metrics'
  }
];

/**
 * Hourly jobs to run more frequently
 */
const hourlyJobs: JobScheduleItem[] = [
  {
    jobType: 'system-health-check',
    handler: async () => executeMaintenanceJob(MaintenanceJobType.SYSTEM_HEALTH_CHECK),
    description: 'Check system health and performance'
  },
  {
    jobType: 'hourly-data-aggregation',
    handler: async () => submitScheduledAnalyticsJob('DATA_AGGREGATION', {
      period: 'hourly'
    }),
    description: 'Aggregate hourly performance data'
  }
];

/**
 * Weekly jobs to run once per week
 */
const weeklyJobs: JobScheduleItem[] = [
  {
    jobType: 'weekly-report-generation',
    handler: async () => submitScheduledAnalyticsJob('REPORT_GENERATION', {
      reportType: 'weekly-summary',
      recipients: ['admin@example.com']
    }),
    description: 'Generate weekly summary reports'
  }
];

/**
 * Main handler for hourly cron schedule
 */
export async function GET(request: Request) {
  console.log('Executing hourly scheduled jobs at:', new Date().toISOString());
  
  const results = [];
  
  // Execute all hourly jobs
  for (const job of hourlyJobs) {
    try {
      console.log(`Starting scheduled job: ${job.jobType}`);
      const result = await job.handler();
      results.push({
        jobType: job.jobType,
        status: 'success',
        result
      });
    } catch (error) {
      console.error(`Error executing ${job.jobType}:`, error);
      results.push({
        jobType: job.jobType,
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  // Check if we should run daily jobs (e.g., if current hour is 1 AM)
  const currentHour = new Date().getHours();
  if (currentHour === 1) {
    console.log('Executing daily scheduled jobs');
    
    for (const job of dailyJobs) {
      try {
        console.log(`Starting scheduled job: ${job.jobType}`);
        const result = await job.handler();
        results.push({
          jobType: job.jobType,
          status: 'success',
          result
        });
      } catch (error) {
        console.error(`Error executing ${job.jobType}:`, error);
        results.push({
          jobType: job.jobType,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }
  
  // Check if we should run weekly jobs (e.g., if it's Monday at 2 AM)
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 1 && currentHour === 2) {
    console.log('Executing weekly scheduled jobs');
    
    for (const job of weeklyJobs) {
      try {
        console.log(`Starting scheduled job: ${job.jobType}`);
        const result = await job.handler();
        results.push({
          jobType: job.jobType,
          status: 'success',
          result
        });
      } catch (error) {
        console.error(`Error executing ${job.jobType}:`, error);
        results.push({
          jobType: job.jobType,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }
  
  return NextResponse.json({
    executed: new Date().toISOString(),
    results
  });
}

/**
 * Vercel Cron configuration
 * This specifies when the cron job should run
 */
export const config = {
  runtime: 'edge',
  regions: ['iad1'], // Use a specific region for better performance
  // Run every hour
  cron: '0 * * * *'
};

