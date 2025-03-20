/**
 * Base event interface for all Kafka events
 * This provides a standardized structure for all events across the system
 */

/**
 * Enum of all possible event types in the system
 * Add new event types here when implementing new event producers
 */
export enum EventType {
  // Notification events
  NOTIFICATION_CREATED = 'notification.created',
  NOTIFICATION_UPDATED = 'notification.updated',
  NOTIFICATION_DELETED = 'notification.deleted',
  
  // Visualization events
  VISUALIZATION_CREATED = 'visualization.created',
  VISUALIZATION_UPDATED = 'visualization.updated',
  VISUALIZATION_DELETED = 'visualization.deleted',
  
  // Places events
  PLACE_CREATED = 'place.created',
  PLACE_UPDATED = 'place.updated',
  PLACE_DELETED = 'place.deleted',
  PLACE_GEOCODING_COMPLETED = 'place.geocoding.completed',
  PLACE_VALIDATION_COMPLETED = 'place.validation.completed',
  
  // Authentication events
  USER_REGISTERED = 'auth.user.registered',
  USER_LOGGED_IN = 'auth.user.logged_in',
  USER_LOGGED_OUT = 'auth.user.logged_out',
  PASSWORD_CHANGED = 'auth.password.changed',
  PASSWORD_RESET_REQUESTED = 'auth.password.reset.requested',
  
  // Analytics events
  USER_ACTIVITY = 'analytics.user.activity',
  FEATURE_USAGE = 'analytics.feature.usage',
  SYSTEM_METRICS = 'analytics.system.metrics',
  
  // Marketplace events
  LISTING_CREATED = 'marketplace.listing.created',
  LISTING_UPDATED = 'marketplace.listing.updated',
  LISTING_DELETED = 'marketplace.listing.deleted',
  BID_PLACED = 'marketplace.bid.placed',
  ORDER_CREATED = 'marketplace.order.created',
  ORDER_FULFILLED = 'marketplace.order.fulfilled',
  PAYMENT_PROCESSED = 'marketplace.payment.processed'
}

/**
 * Base event interface that all event types should extend
 */
export interface BaseEvent {
  /**
   * Unique identifier for the event
   */
  id: string;
  
  /**
   * Timestamp when the event was created
   */
  timestamp: string;
  
  /**
   * Type of the event, from EventType enum
   */
  type: EventType;
  
  /**
   * Schema version for forward compatibility
   */
  version: string;
  
  /**
   * Optional correlation ID for tracking related events
   */
  correlationId?: string;
  
  /**
   * Optional source service that generated the event
   */
  source?: string;
}

/**
 * Generic event payload interface that specific event types should implement
 */
export interface EventPayload<T> extends BaseEvent {
  /**
   * Event-specific data payload
   */
  data: T;
}

