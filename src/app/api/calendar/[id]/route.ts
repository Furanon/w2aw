import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { calendar_events, event_participants } from '@/db/schema';
import { auth } from '@/auth';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

// Define the schema for event updates
const eventUpdateSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  location_id: z.number().int().positive().optional(),
  instructor_id: z.string().uuid().optional(),
  type: z.enum(['RELAX_WELLNESS', 'OUTDOOR_ACTIVE', 'BEACH_SUN', 'DRINKS_NIGHTLIFE', 'FOOD_FAMILY', 'ACCOMMODATION']).optional(),
  is_recurring: z.boolean().optional(),
  recurrence_pattern: z.string().optional(),
  is_paid: z.boolean().optional(),
  price: z.number().nonnegative().optional(),
  max_participants: z.number().int().positive().optional(),
  image_url: z.string().url().optional(),
  recurring_update_type: z.enum(['THIS_EVENT', 'THIS_AND_FUTURE', 'ALL_EVENTS']).optional(),
  update_all_instances: z.boolean().optional(),
});

// GET handler for retrieving a specific event
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const id = params.id;
    
    // Retrieve the event with its location, instructor, and participants
    const event = await db.query.calendar_events.findFirst({
      where: eq(calendar_events.id, parseInt(id)),
      with: {
        location: true,
        instructor: true,
        participants: {
          with: {
            user: true
          }
        }
      }
    });
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    // Calculate additional fields like available spots
    const availableSpots = event.max_participants 
      ? event.max_participants - event.participants.length 
      : null;
    
    // Check if current user is registered
    const isCurrentUserRegistered = event.participants.some(
      participant => participant.user_id === session.user?.id
    );
    
    return NextResponse.json({
      ...event,
      available_spots: availableSpots,
      is_user_registered: isCurrentUserRegistered
    });
  } catch (error) {
    console.error(`Error retrieving event ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to retrieve event' },
      { status: 500 }
    );
  }
}

// PATCH handler for updating a specific event
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const id = params.id;
    const body = await request.json();
    
    // Validate request body
    const validationResult = eventUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid event data', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const updateData = validationResult.data;
    
    // Get the original event to check permissions and handle recurring updates
    const originalEvent = await db.query.calendar_events.findFirst({
      where: eq(calendar_events.id, parseInt(id))
    });
    
    if (!originalEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    // Check if user is authorized to update this event
    // Only creator or admin can update
    if (originalEvent.created_by !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Not authorized to update this event' },
        { status: 403 }
      );
    }
    
    // Process date strings if provided
    let startTime = updateData.start_time ? new Date(updateData.start_time) : undefined;
    let endTime = updateData.end_time ? new Date(updateData.end_time) : undefined;
    
    // If both dates are provided, validate them
    if (startTime && endTime && endTime <= startTime) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }
    
    // Handle recurring event updates based on recurring_update_type
    if (originalEvent.is_recurring && updateData.recurring_update_type) {
      // Different handling based on update type
      switch (updateData.recurring_update_type) {
        case 'THIS_EVENT':
          // Update only this specific instance
          break;
          
        case 'THIS_AND_FUTURE':
          // TODO: Implement logic to update this and all future recurring events
          // This would involve fetching all events with the same recurrence_id
          // and updating those with start_time >= this event's start_time
          return NextResponse.json(
            { error: 'Updating future recurring events is not yet implemented' },
            { status: 501 }
          );
          
        case 'ALL_EVENTS':
          // TODO: Implement logic to update all events in the series
          // This would involve fetching all events with the same recurrence_id
          return NextResponse.json(
            { error: 'Updating all recurring events is not yet implemented' },
            { status: 501 }
          );
          
        default:
          break;
      }
    }
    
    // Update the event
    const [updatedEvent] = await

