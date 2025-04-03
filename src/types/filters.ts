/**
 * Shared filter types for calendar and map views
 * Aligned with database values from event_types table and related filtering criteria
 */

/**
 * Event type definition matching database schema
 */
export interface EventType {
  id: number;
  name: string;
  color: string;  // color_code from database
}

/**
 * Event-specific criteria for filtering
 */
export interface EventSpecificCriteria {
  priceRange: {
    min: number;
    max: number;
  };
  timeRange: {
    startTime: string | null;  // Time in HH:mm format
    endTime: string | null;    // Time in HH:mm format
  };
  preferredDays: number[];     // Array of days (0-6, where 0 is Sunday)
  paymentStatus: string[];     // ["pending", "paid", "free", etc.]
  capacity: {
    min: number;
    max: number | null;
  };
}

/**
 * Filter state interface to track active filters across components
 */
export interface FilterState {
  // Event Type Filters
  typeIds: number[];
  
  // Location Filters
  locations: string[];
  
  // Instructor/Teacher Filters
  instructorIds: string[];
  
  // Payment Filters
  showPaidOnly: boolean;
  showFreeOnly: boolean;
  
  // Participation Filters
  showJoinedOnly: boolean;
  showAvailableOnly: boolean;  // Events with open spots
  
  // Search Filters
  vectorSearch: string;
  
  // Event-specific Criteria
  eventCriteria: EventSpecificCriteria;
}

/**
 * Event types with exact values from database
 */
export const EVENT_TYPES: EventType[] = [
  { id: 1, name: "Relax and Wellness", color: "#4CAF50" },
  { id: 2, name: "Outdoor and Active", color: "#2196F3" },
  { id: 3, name: "Beach and Sun", color: "#FF9800" },
  { id: 4, name: "Drinks and Nightlife", color: "#9C27B0" },
  { id: 5, name: "Food and Family", color: "#F44336" },
  { id: 6, name: "Accommodation", color: "#795548" },
  { id: 7, name: "Transport and Tours", color: "#3F51B5" },
];

/**
 * Default filter state with all database event types enabled
 */
export const DEFAULT_FILTER_STATE: FilterState = {
  // Event Type Filters
  typeIds: EVENT_TYPES.map(type => type.id),

  // Location Filters
  locations: [],

  // Instructor Filters
  instructorIds: [],

  // Payment Filters
  showPaidOnly: false,
  showFreeOnly: false,

  // Participation Filters
  showJoinedOnly: false,
  showAvailableOnly: false,

  // Search Filters
  vectorSearch: "",

  // Event-specific Criteria
  eventCriteria: {
    priceRange: {
      min: 0,
      max: Infinity,
    },
    timeRange: {
      startTime: null,
      endTime: null,
    },
    preferredDays: [],
    paymentStatus: [],
    capacity: {
      min: 1,
      max: null,
    },
  },
};

/**
 * Special status colors for event rendering
 */
export const SPECIAL_STATUS_COLORS = {
  TEACHER: "#3F51B5",
  HIGHLY_ACKNOWLEDGED_TEACHER: "#1A237E",
  USER_JOINED: "#8BC34A",
};

/**
 * Payment status types from event_participants table
 */
export const PAYMENT_STATUS_TYPES = {
  PENDING: "pending",
  PAID: "paid",
  FREE: "free",
  CANCELLED: "cancelled",
};
