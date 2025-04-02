export interface Event {
  id: number;
  title: string;
  start: Date;
  end: Date;
  type: EventType;
  isPaid: boolean;
  price: number;
  location: string;
  instructorId: string;
  isHighlyAcknowledged: boolean;
  participants: string[];
  description?: string;
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
}

export type EventType = 
  | 'Relax and Wellness'
  | 'Outdoor and Active'
  | 'Beach and Sun'
  | 'Drinks and Nightlife'
  | 'Food and Family'
  | 'Accommodation';

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  endDate?: Date;
  occurrences?: number;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  coordinates: [number, number]; // [latitude, longitude]
}

