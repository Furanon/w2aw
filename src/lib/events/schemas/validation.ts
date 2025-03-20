import { z } from 'zod';

// Basic event schema for all events
export const BaseEventSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.number().int().positive(),
  version: z.string(),
  type: z.string(),
  source: z.string(),
  correlationId: z.string().uuid().optional(),
});

// Define payload schemas for different event types

// Notification event schemas
export const NotificationCreatedPayloadSchema = z.object({
  userId: z.string().uuid(),
  content: z.string(),
  title: z.string(),
  type: z.string(),
  read: z.boolean().default(false),
});

export const NotificationUpdatedPayloadSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().optional(),
  content: z.string().optional(),
  title: z.string().optional(),
  type: z.string().optional(),
  read: z.boolean().optional(),
});

export const NotificationDeletedPayloadSchema = z.object({
  id: z.string().uuid(),
});

// Visualization event schemas
export const VisualizationUpdatedPayloadSchema = z.object({
  id: z.string().uuid(),
  data: z.record(z.unknown()),
  chartType: z.string(),
  title: z.string().optional(),
  updatedBy: z.string().uuid(),
});

export const VisualizationCreatedPayloadSchema = z.object({
  data: z.record(z.unknown()),
  chartType: z.string(),
  title: z.string(),
  createdBy: z.string().uuid(),
});

// Authentication event schemas
export const UserLoggedInPayloadSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  timestamp: z.number().int().positive(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export const UserSignedUpPayloadSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().optional(),
  timestamp: z.number().int().positive(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export const UserPasswordChangedPayloadSchema = z.object({
  userId: z.string().uuid(),
  timestamp: z.number().int().positive(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

// Places API event schemas
export const PlaceCreatedPayloadSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  address: z.string(),
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
  createdBy: z.string().uuid(),
});

export const PlaceUpdatedPayloadSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  address: z.string().optional(),
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
  updatedBy: z.string().uuid(),
});

// Analytics event schemas
export const AnalyticsEventPayloadSchema = z.object({
  eventName: z.string(),
  userId: z.string().uuid().optional(),
  sessionId: z.string().optional(),
  properties: z.record(z.unknown()).optional(),
  timestamp: z.number().int().positive(),
});

// Marketplace event schemas
export const ListingCreatedPayloadSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  price: z.number().positive(),
  sellerId: z.string().uuid(),
  category: z.string(),
  images: z.array(z.string().url()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const BidPlacedPayloadSchema = z.object({
  listingId: z.string().uuid(),
  bidderId: z.string().uuid(),
  amount: z.number().positive(),
  timestamp: z.number().int().positive(),
});

export const PurchaseCompletedPayloadSchema = z.object({
  listingId: z.string().uuid(),
  buyerId: z.string().uuid(),
  sellerId: z.string().uuid(),
  amount: z.number().positive(),
  timestamp: z.number().int().positive(),
  transactionId: z.string().uuid(),
});

// Union of all event payload schemas
export const EventPayloadSchema = z.union([
  // Notification events
  NotificationCreatedPayloadSchema,
  NotificationUpdatedPayloadSchema,
  NotificationDeletedPayloadSchema,
  
  // Visualization events
  VisualizationCreatedPayloadSchema,
  VisualizationUpdatedPayloadSchema,
  
  // Auth events
  UserLoggedInPayloadSchema,
  UserSignedUpPayloadSchema,
  UserPasswordChangedPayloadSchema,
  
  // Places events
  PlaceCreatedPayloadSchema,
  PlaceUpdatedPayloadSchema,
  
  // Analytics events
  AnalyticsEventPayloadSchema,
  
  // Marketplace events
  ListingCreatedPayloadSchema,
  BidPlacedPayloadSchema,
  PurchaseCompletedPayloadSchema,
]);

// Complete event schema with payload
export const EventSchema = BaseEventSchema.extend({
  payload: EventPayloadSchema,
});

// Type-safe validation function
export function validateEvent(event: unknown) {
  return EventSchema.safeParse(event);
}

// Type-safe validation function for specific event types
export function validateEventByType(event: unknown, type: string) {
  const baseResult = BaseEventSchema.safeParse(event);
  
  if (!baseResult.success) {
    return baseResult;
  }
  
  // Select the appropriate payload schema based on event type
  let payloadSchema;
  switch (type) {
    // Notification events
    case 'notification.created':
      payloadSchema = NotificationCreatedPayloadSchema;
      break;
    case 'notification.updated':
      payloadSchema = NotificationUpdatedPayloadSchema;
      break;
    case 'notification.deleted':
      payloadSchema = NotificationDeletedPayloadSchema;
      break;
      
    // Visualization events
    case 'visualization.created':
      payloadSchema = VisualizationCreatedPayloadSchema;
      break;
    case 'visualization.updated':
      payloadSchema = VisualizationUpdatedPayloadSchema;
      break;
      
    // Auth events
    case 'user.loggedin':
      payloadSchema = UserLoggedInPayloadSchema;
      break;
    case 'user.signedup':
      payloadSchema = UserSignedUpPayloadSchema;
      break;
    case 'user.passwordchanged':
      payloadSchema = UserPasswordChangedPayloadSchema;
      break;
      
    // Places events
    case 'place.created':
      payloadSchema = PlaceCreatedPayloadSchema;
      break;
    case 'place.updated':
      payloadSchema = PlaceUpdatedPayloadSchema;
      break;
      
    // Analytics events
    case 'analytics.event':
      payloadSchema = AnalyticsEventPayloadSchema;
      break;
      
    // Marketplace events
    case 'listing.created':
      payloadSchema = ListingCreatedPayloadSchema;
      break;
    case 'bid.placed':
      payloadSchema = BidPlacedPayloadSchema;
      break;
    case 'purchase.completed':
      payloadSchema = PurchaseCompletedPayloadSchema;
      break;
      
    default:
      return z.object({
        success: z.literal(false),
        error: z.string()
      }).parse({
        success: false,
        error: `Unknown event type: ${type}`
      });
  }
  
  // Validate the payload with the selected schema
  const payloadResult = payloadSchema.safeParse((event as any).payload);
  
  if (!payloadResult.success) {
    return payloadResult;
  }
  
  return baseResult;
}

