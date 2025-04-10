import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { EventService } from '@/lib/services/eventService';
import { KafkaService } from '@/lib/services/kafkaService';
import { KAFKA_TOPICS } from '@/lib/config/kafka';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Initialize services
const eventService = new EventService();
const kafkaService = KafkaService.getInstance();

// Validation schema for filter parameters
const FilterQuerySchema = z.object({
  typeIds: z.string().optional().transform(val => 
    val ? val.split(',').map(id => parseInt(id, 10)) : undefined
  ),
  locations: z.string().optional().transform(val => 
    val ? val.split(',') : undefined
  ),
  instructorIds: z.string().optional().transform(val => 
    val ? val.split(',') : undefined
  ),
  showPaidOnly: z.string().optional().transform(val => 
    val === 'true'
  ),
  showFreeOnly: z.string().optional().transform(val => 
    val === 'true'
  ),
  showJoinedOnly: z.string().optional().transform(val => 
    val === 'true'
  ),
  showAvailableOnly: z.string().optional().transform(val => 
    val === 'true'
  ),
  vectorSearch: z.string().optional(),
  minPrice: z.string().optional().transform(val => 
    val ? parseFloat(val) : undefined
  ),
  maxPrice: z.string().optional().transform(val => 
    val ? parseFloat(val) : undefined
  ),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  preferredDays: z.string().optional().transform(val => 
    val ? val.split(',').map(day => parseInt(day, 10)) : undefined
  ),
  paymentStatus: z.string().optional().transform(val => 
    val ? val.split(',') : undefined
  ),
  minCapacity: z.string().optional().transform(val => 
    val ? parseInt(val, 10) : undefined
  ),
  maxCapacity: z.string().optional().transform(val => 
    val ? parseInt(val, 10) : undefined
  ),
});

// GET handler for events with filtering
export async function GET(request: NextRequest) {
  try {
    // Parse the URL for query parameters
    const { searchParams } = new URL(request.url);
    const rawParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      rawParams[key] = value;
    });

    // Validate and parse query parameters
    const parsedParams = FilterQuerySchema.safeParse(rawParams);
    
    if (!parsedParams.success) {
      return NextResponse.json(
        { 
          error: 'Invalid filter parameters', 
          details: parsedParams.error.format() 
        }, 
        { status: 400 }
      );
    }

    // Get user session for personalized results
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Convert parsed params to filter structure expected by EventService
    const filters = {
      typeIds: parsedParams.data.typeIds || [],
      locations: parsedParams.data.locations || [],
      instructorIds: parsedParams.data.instructorIds || [],
      showPaidOnly: parsedParams.data.showPaidOnly || false,
      showFreeOnly: parsedParams.data.showFreeOnly || false,
      showJoinedOnly: parsedParams.data.showJoinedOnly || false,
      showAvailableOnly: parsedParams.data.showAvailableOnly || false,
      vectorSearch: parsedParams.data.vectorSearch || '',
      eventCriteria: {
        priceRange: {
          min: parsedParams.data.minPrice || 0,
          max: parsedParams.data.maxPrice || Infinity,
        },
        timeRange: {
          startTime: parsedParams.data.startTime || null,
          endTime: parsedParams.data.endTime || null,
        },
        preferredDays: parsedParams.data.preferredDays || [],
        paymentStatus: parsedParams.data.paymentStatus || [],
        capacity: {
          min: parsedParams.data.minCapacity || 1,
          max: parsedParams.data.maxCapacity || null,
        },
      },
    };

    // Log the request (optional)
    console.log('Fetching events with filters:', filters);

    // Fetch events based on filters
    const events = await eventService.getEvents(filters, userId);

    // Track filter usage in Kafka for analytics
    if (userId) {
      const filterUpdateMessage = kafkaService.createCalendarUpdateMessage(filters, userId);
      await kafkaService.publishMessage(KAFKA_TOPICS.CALENDAR_UPDATES, filterUpdateMessage)
        .catch(error => {
          console.error('Failed to publish filter update to Kafka:', error);
          // Non-critical error, don't fail the request
        });
    }

    // Return successful response with events
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' }, 
      { status: 500 }
    );
  }
}

// POST handler for joining events
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    
    const JoinEventSchema = z.object({
      eventId: z.string().min(1, "Event ID is required"),
      action: z.enum(['join'], { 
        errorMap: () => ({ message: "Only 'join' action is supported" })
      })
    });
    
    const validatedBody = JoinEventSchema.safeParse(body);
    
    if (!validatedBody.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: validatedBody.error.format() 
        }, 
        { status: 400 }
      );
    }
    
    // Get user session for authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const { eventId } = validatedBody.data;
    
    // Join the event
    const success = await eventService.joinEvent(eventId, userId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to join event' }, 
        { status: 500 }
      );
    }
    
    // Get the full event details
    const event = await eventService.getEventById(eventId, userId);
    
    // Publish join event message to Kafka
    const joinEventMessage = kafkaService.createCalendarEventMessage(
      eventId,
      'joined',
      { eventId, userId, timestamp: new Date().toISOString() },
      userId
    );
    
    await kafkaService.publishMessage(KAFKA_TOPICS.CALENDAR_EVENTS, joinEventMessage)
      .catch(error => {
        console.error('Failed to publish join event to Kafka:', error);
        // Non-critical error, continue with the response
      });
    
    // Return successful response
    return NextResponse.json({ 
      success: true, 
      message: 'Successfully joined event',
      event
    });
  } catch (error) {
    console.error('Error joining event:', error);
    return NextResponse.json(
      { error: 'Failed to join event' }, 
      { status: 500 }
    );
  }
}

