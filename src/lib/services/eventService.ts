import { db } from '@/db';
import { calendarEvents, locations, eventParticipants, userCoursePreferences, userLocationPreferences } from '@/db/schema';
import { eq, and, or, inArray, gte, lte, like, between, sql } from 'drizzle-orm';
import { FilterState } from '@/types/filters';
import { z } from 'zod';

// Types for event data
export interface EventWithLocation {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  eventTypeId: number;
  location: {
    id: string;
    name: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  price: number;
  capacity: number;
  currentParticipants: number;
  participants: string[];
  isCreator: boolean;
  isHighlyAcknowledged: boolean;
  isJoined: boolean;
  createdBy: string;
}

// Validation schema for filtering events
export const EventFilterSchema = z.object({
  typeIds: z.array(z.number()).optional(),
  locations: z.array(z.string()).optional(),
  instructorIds: z.array(z.string()).optional(),
  showPaidOnly: z.boolean().optional(),
  showFreeOnly: z.boolean().optional(),
  showJoinedOnly: z.boolean().optional(),
  showAvailableOnly: z.boolean().optional(),
  vectorSearch: z.string().optional(),
  eventCriteria: z.object({
    priceRange: z.object({
      min: z.number(),
      max: z.number().or(z.literal(Infinity)),
    }).optional(),
    timeRange: z.object({
      startTime: z.string().nullable(),
      endTime: z.string().nullable(),
    }).optional(),
    preferredDays: z.array(z.number()).optional(),
    paymentStatus: z.array(z.string()).optional(),
    capacity: z.object({
      min: z.number(),
      max: z.number().nullable(),
    }).optional(),
  }).optional(),
});

// Event Service class
export class EventService {
  /**
   * Get all calendar events with filtering
   */
  async getEvents(filters: FilterState, userId?: string): Promise<EventWithLocation[]> {
    try {
      // Validate filters
      const validatedFilters = EventFilterSchema.parse(filters);
      
      // Base query conditions
      let conditions = [];
      
      // Filter by event types
      if (validatedFilters.typeIds && validatedFilters.typeIds.length > 0) {
        conditions.push(inArray(calendarEvents.type, validatedFilters.typeIds.map(id => {
          // Map typeId to type string based on eventTypeEnum
          const typeMap = {
            1: 'Relax and Wellness',
            2: 'Outdoor and Active',
            3: 'Beach and Sun',
            4: 'Drinks and Nightlife',
            5: 'Food and Family',
            6: 'Accommodation',
            7: 'Transport and Tours',
          };
          return typeMap[id] || 'Relax and Wellness';
        })));
      }
      
      // Filter by locations
      if (validatedFilters.locations && validatedFilters.locations.length > 0) {
        const locationConditions = validatedFilters.locations.map(loc => 
          like(locations.name, `%${loc}%`)
        );
        conditions.push(or(...locationConditions));
      }
      
      // Filter by instructor IDs
      if (validatedFilters.instructorIds && validatedFilters.instructorIds.length > 0) {
        conditions.push(inArray(calendarEvents.instructorId, validatedFilters.instructorIds.map(id => parseInt(id))));
      }
      
      // Filter by payment type
      if (validatedFilters.showPaidOnly) {
        conditions.push(eq(calendarEvents.isPaid, true));
      }
      
      if (validatedFilters.showFreeOnly) {
        conditions.push(eq(calendarEvents.isPaid, false));
      }
      
      // Price range filtering
      if (validatedFilters.eventCriteria?.priceRange) {
        const { min, max } = validatedFilters.eventCriteria.priceRange;
        
        if (min > 0) {
          conditions.push(gte(calendarEvents.price, min));
        }
        
        if (max !== Infinity) {
          conditions.push(lte(calendarEvents.price, max));
        }
      }
      
      // Time range filtering
      if (validatedFilters.eventCriteria?.timeRange) {
        const { startTime, endTime } = validatedFilters.eventCriteria.timeRange;
        
        if (startTime) {
          conditions.push(gte(calendarEvents.start, new Date(startTime)));
        }
        
        if (endTime) {
          conditions.push(lte(calendarEvents.end, new Date(endTime)));
        }
      }
      
      // Vector search if provided
      if (validatedFilters.vectorSearch && validatedFilters.vectorSearch.trim().length > 0) {
        // In a real app, this would use PostgreSQL vector search capabilities
        // For now, use simple text search on title and description
        const searchTerm = `%${validatedFilters.vectorSearch.trim()}%`;
        conditions.push(
          or(
            like(calendarEvents.title, searchTerm),
            like(calendarEvents.description, searchTerm)
          )
        );
      }
      
      // Default condition if none provided
      if (conditions.length === 0) {
        conditions.push(gte(calendarEvents.start, new Date())); // Future events by default
      }
      
      // Execute query with joins
      const eventsWithLocations = await db
        .select({
          id: calendarEvents.id,
          title: calendarEvents.title,
          description: calendarEvents.description,
          startTime: calendarEvents.start,
          endTime: calendarEvents.end,
          type: calendarEvents.type,
          isPaid: calendarEvents.isPaid,
          price: calendarEvents.price,
          locationId: locations.id,
          locationName: locations.name,
          locationAddress: locations.address,
          locationCoordinates: locations.coordinates,
          instructorId: calendarEvents.instructorId,
          isHighlyAcknowledged: calendarEvents.isHighlyAcknowledged,
          createdAt: calendarEvents.createdAt,
        })
        .from(calendarEvents)
        .leftJoin(locations, eq(calendarEvents.locationId, locations.id))
        .where(and(...conditions));
      
      // Get participant counts from event_participants for each event
      const eventIds = eventsWithLocations.map(event => event.id);
      
      // Get participants for events
      const participants = eventIds.length > 0 
        ? await db
            .select({
              eventId: eventParticipants.eventId,
              userId: eventParticipants.userId,
              isPaid: eventParticipants.isPaid,
            })
            .from(eventParticipants)
            .where(inArray(eventParticipants.eventId, eventIds))
        : [];
      
      // Map events to response format with additional data
      const formattedEvents: EventWithLocation[] = eventsWithLocations.map(event => {
        // Get all participants for this event
        const eventParticipants = participants.filter(p => p.eventId === event.id);
        
        // Check if current user is joined (if userId provided)
        const isJoined = userId 
          ? eventParticipants.some(p => p.userId === parseInt(userId)) 
          : false;
        
        // Parse coordinates data
        const coordinates = typeof event.locationCoordinates === 'string'
          ? JSON.parse(event.locationCoordinates)
          : event.locationCoordinates || [0, 0];
          
        // Format event with location data
        return {
          id: event.id.toString(),
          title: event.title,
          description: event.description,
          startTime: event.startTime.toISOString(),
          endTime: event.endTime.toISOString(),
          eventTypeId: this.getEventTypeId(event.type), // Convert string type to numeric id
          location: {
            id: event.locationId.toString(),
            name: event.locationName,
            address: event.locationAddress,
            coordinates: {
              lat: coordinates[0],
              lng: coordinates[1],
            },
          },
          price: parseFloat(event.price.toString()),
          capacity: 0, // We need to get this from another table or add it to schema
          currentParticipants: eventParticipants.length,
          participants: eventParticipants.map(p => p.userId.toString()),
          isCreator: userId ? event.instructorId.toString() === userId : false,
          isHighlyAcknowledged: event.isHighlyAcknowledged,
          isJoined,
          createdBy: event.instructorId.toString(),
        };
      });
      
      // Filter joined events if requested
      if (validatedFilters.showJoinedOnly && userId) {
        return formattedEvents.filter(event => event.isJoined);
      }
      
      // Filter available events if requested
      if (validatedFilters.showAvailableOnly) {
        return formattedEvents.filter(event => 
          event.capacity === 0 || event.currentParticipants < event.capacity
        );
      }
      
      return formattedEvents;
    } catch (error) {
      console.error('Error fetching events:', error);
      throw new Error('Failed to fetch events');
    }
  }
  
  /**
   * Get a single event by ID
   */
  async getEventById(eventId: string, userId?: string): Promise<EventWithLocation | null> {
    try {
      const event = await db
        .select({
          id: calendarEvents.id,
          title: calendarEvents.title,
          description: calendarEvents.description,
          startTime: calendarEvents.start,
          endTime: calendarEvents.end,
          type: calendarEvents.type,
          isPaid: calendarEvents.isPaid,
          price: calendarEvents.price,
          locationId: locations.id,
          locationName: locations.name,
          locationAddress: locations.address,
          locationCoordinates: locations.coordinates,
          instructorId: calendarEvents.instructorId,
          isHighlyAcknowledged: calendarEvents.isHighlyAcknowledged,
          createdAt: calendarEvents.createdAt,
        })
        .from(calendarEvents)
        .leftJoin(locations, eq(calendarEvents.locationId, locations.id))
        .where(eq(calendarEvents.id, parseInt(eventId)))
        .limit(1);
        
      if (!event || event.length === 0) {
        return null;
      }
      
      const eventData = event[0];
      
      // Get participants
      const participants = await db
        .select({
          userId: eventParticipants.userId,
          isPaid: eventParticipants.isPaid,
        })
        .from(eventParticipants)
        .where(eq(eventParticipants.eventId, parseInt(eventId)));
      
      // Check if current user is joined
      const isJoined = userId 
        ? participants.some(p => p.userId === parseInt(userId)) 
        : false;
      
      // Parse coordinates data
      const coordinates = typeof eventData.locationCoordinates === 'string'
        ? JSON.parse(eventData.locationCoordinates)
        : eventData.locationCoordinates || [0, 0];
        
      return {
        id: eventData.id.toString(),
        title: eventData.title,
        description: eventData.description,
        startTime: eventData.startTime.toISOString(),
        endTime: eventData.endTime.toISOString(),
        eventTypeId: this.getEventTypeId(eventData.type),
        location: {
          id: eventData.locationId.toString(),
          name: eventData.locationName,
          address: eventData.locationAddress,
          coordinates: {
            lat: coordinates[0],
            lng: coordinates[1],
          },
        },
        price: parseFloat(eventData.price.toString()),
        capacity: 0, // We need to get this from another table or add it to schema
        currentParticipants: participants.length,
        participants: participants.map(p => p.userId.toString()),
        isCreator: userId ? eventData.instructorId.toString() === userId : false,
        isHighlyAcknowledged: eventData.isHighlyAcknowledged,
        isJoined,
        createdBy: eventData.instructorId.toString(),
      };
    } catch (error) {
      console.error('Error fetching event by id:', error);
      throw new Error('Failed to fetch event');
    }
  }
  
  /**
   * Join an event (add user to event_participants)
   */
  async joinEvent(eventId: string, userId: string): Promise<boolean> {
    try {
      // Check if user already joined
      const existingParticipant = await db
        .select()
        .from(eventParticipants)
        .where(
          and(
            eq(eventParticipants.eventId, parseInt(eventId)),
            eq(eventParticipants.userId, parseInt(userId))
          )
        )
        .limit(1);
      
      if (existingParticipant && existingParticipant.length > 0) {
        return true; // Already joined
      }
      
      // Get event details to check if paid or free
      const event = await db
        .select({
          isPaid: calendarEvents.isPaid,
          price: calendarEvents.price,
        })
        .from(calendarEvents)
        .where(eq(calendarEvents.id, parseInt(eventId)))
        .limit(1);
      
      if (!event || event.length === 0) {
        throw new Error('Event not found');
      }
      
      const eventData = event[0];
      
      // Add user to participants
      await db.insert(eventParticipants).values({
        eventId: parseInt(eventId),
        userId: parseInt(userId),
        registeredAt: new Date(),
        paymentStatus: eventData.isPaid ? 'pending' : 'free',
        isPaid: !eventData.isPaid, // Free events are automatically marked as paid
        amountPaid: eventData.isPaid ? 0 : null, // Amount paid is null for free events
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      return true;
    } catch (error) {
      console.error('Error joining event:', error);
      throw new Error('Failed to join event');
    }
  }
  
  /**
   * Get user's preferred event types based on previous interactions
   */
  async getUserPreferences(userId: string): Promise<{
    typeIds: number[];
    locations: string[];
  }> {
    try {
      // Get user course preferences
      const coursePrefs = await db
        .select({
          activityType: userCoursePreferences.activityType,
          locationId: userCoursePreferences.locationId,
        })
        .from(userCoursePreferences)
        .where(eq(userCoursePreferences.userId, parseInt(

