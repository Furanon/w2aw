import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { producer } from '../../../lib/kafka';
import logger from '../../../lib/logger';

// Define the job types
const JobType = z.enum([
  'authentication',
  'marketplace',
  'ai',
  'maintenance',
  'analytics',
]);

// Define the request schema
const JobRequestSchema = z.object({
  type: JobType,
  payload: z.record(z.any()),
});

type JobRequest = z.infer<typeof JobRequestSchema>;

// Map job types to Kafka topics
const jobTopics: Record<z.infer<typeof JobType>, string> = {
  authentication: 'auth-jobs',
  marketplace: 'marketplace-jobs',
  ai: 'ai-jobs',
  maintenance: 'maintenance-jobs',
  analytics: 'analytics-jobs',
};

/**
 * API route handler for job submission
 * Accepts POST requests with job type and payload
 * Validates input and submits job to appropriate Kafka queue
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await request.json();
    
    const validationResult = JobRequestSchema.safeParse(body);
    if (!validationResult.success) {
      logger.warn('Invalid job request received', {
        errors: validationResult.error.errors,
      });
      
      return NextResponse.json(
        { 
          error: 'Invalid request format', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }
    
    const { type, payload } = validationResult.data;
    const topic = jobTopics[type];
    
    if (!topic) {
      logger.error('Job type does not have a corresponding topic', { type });
      return NextResponse.json(
        { error: 'Job type configuration error' },
        { status: 500 }
      );
    }
    
    // Generate a unique job ID
    const jobId = crypto.randomUUID();
    
    // Create the job message
    const message = {
      id: jobId,
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    
    logger.info('Submitting job to Kafka', { jobId, type });
    
    // Send the job to Kafka
    await producer.send({
      topic,
      messages: [
        { 
          key: jobId,
          value: JSON.stringify(message),
        },
      ],
    });
    
    logger.info('Job submitted successfully', { jobId, type });
    
    return NextResponse.json(
      { 
        success: true, 
        jobId,
        message: 'Job submitted successfully' 
      },
      { status: 202 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error submitting job', { error: errorMessage });
    
    return NextResponse.json(
      { 
        error: 'Failed to process job request',
        message: errorMessage
      },
      { status: 500 }
    );
  }
}

