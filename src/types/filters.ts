/**
 * Shared filter types for calendar and map views
 */

/**
 * Event type definition with identifier, name, and display color
 */
export interface EventType {
  id: number;
  name: string;
  color: string;
}

/**
 * Filter state interface to track active filters across components
 */
export interface FilterState {
  typeIds: number[];
  locations: string[];
  showPaidOnly: boolean;
  showFreeOnly: boolean;
  showJoinedOnly: boolean;
  vectorSearch: string;
}

/**
 * Predefined event types with corresponding colors
 */
export const EVENT_TYPES: EventType[] = [
  { id: 1, name: 'Relax and Wellness', color: '#4CAF50' },
  { id: 2, name: 'Outdoor and Active', color: '#2196F3' },
  { id: 3, name: 'Beach and Sun', color: '#FF9800' },
  { id: 4, name: 'Drinks and Nightlife', color: '#9C27B0' },
  { id: 5, name: 'Food and Family', color: '#F44336' },
  { id: 6, name: 'Accommodation', color: '#795548' },
  { id: 7, name: 'Transport and Tours', color: '#3F51B5' },
];

/**
 * Default filter state with all filters enabled
 */
export const DEFAULT_FILTER_STATE: FilterState = {
  typeIds: EVENT_TYPES.map(type => type.id),
  locations: [],  // Will typically be populated based on available locations
  showPaidOnly: false,
  showFreeOnly: false,
  showJoinedOnly: false,
  vectorSearch: '',
};

/**
 * Special status colors for event rendering
 */
export const SPECIAL_STATUS_COLORS = {
  TEACHER: '#3F51B5',
  HIGHLY_ACKNOWLEDGED_TEACHER: '#1A237E',
  USER_JOINED: '#8BC34A',
};

