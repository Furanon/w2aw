import { pgTable, serial, text, varchar, timestamp, integer, decimal, boolean, array, json, jsonb, primaryKey, unique, time } from 'drizzle-orm/pg-core';
import { InferModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const listings = pgTable('listings', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  locationName: varchar('location_name', { length: 255 }).notNull(),
  propertyType: varchar('property_type', { length: 50 }).notNull(),
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  squareFeet: integer('square_feet'),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  userId: integer('user_id').references(() => users.id),
});

// Calendar event types enum as a PostgreSQL enum
export const eventTypeEnum = [
  'Relax and Wellness',
  'Outdoor and Active',
  'Beach and Sun',
  'Drinks and Nightlife',
  'Food and Family',
  'Accommodation',
] as const;

// Frequency enum for recurring patterns
export const frequencyEnum = [
  'daily',
  'weekly',
  'monthly',
] as const;

// Locations table for the circus school
export const locations = pgTable('locations', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address').notNull(),
  coordinates: json('coordinates').$type<[number, number]>().notNull(), // [latitude, longitude]
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Calendar events table
export const calendarEvents = pgTable('calendar_events', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  start: timestamp('start_time').notNull(),
  end: timestamp('end_time').notNull(),
  type: varchar('type', { length: 50 }).$type<typeof eventTypeEnum[number]>().notNull(),
  isPaid: boolean('is_paid').default(false).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).default('0').notNull(),
  locationId: integer('location_id').references(() => locations.id).notNull(),
  instructorId: integer('instructor_id').references(() => users.id).notNull(),
  isHighlyAcknowledged: boolean('is_highly_acknowledged').default(false).notNull(),
  isRecurring: boolean('is_recurring').default(false).notNull(),
  // Stripe payment fields
  stripeProductId: varchar('stripe_product_id', { length: 255 }),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Recurring patterns for events
export const recurringPatterns = pgTable('recurring_patterns', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').references(() => calendarEvents.id).notNull(),
  frequency: varchar('frequency', { length: 20 }).$type<typeof frequencyEnum[number]>().notNull(),
  interval: integer('interval').notNull(),
  endDate: timestamp('end_date'),
  occurrences: integer('occurrences'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Event participants (registrations)
export const eventParticipants = pgTable('event_participants', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').references(() => calendarEvents.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  registeredAt: timestamp('registered_at').defaultNow().notNull(),
  // Stripe payment status fields
  paymentStatus: varchar('payment_status', { length: 50 }).default('pending').notNull(),
  stripeSessionId: varchar('stripe_session_id', { length: 255 }),
  stripePurchaseId: varchar('stripe_purchase_id', { length: 255 }),
  amountPaid: decimal('amount_paid', { precision: 10, scale: 2 }),
  isPaid: boolean('is_paid').default(false).notNull(),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  // Add a unique constraint to prevent duplicate registrations
  uniqueRegistration: unique().on(eventId, userId),
});

export type User = InferModel<typeof users>;
export type Listing = InferModel<typeof listings>;
export type Location = InferModel<typeof locations>;
export type CalendarEvent = InferModel<typeof calendarEvents>;
export type RecurringPattern = InferModel<typeof recurringPatterns>;
export type EventParticipant = InferModel<typeof eventParticipants>;
// Recommendation types enum
export const recommendationTypeEnum = [
  'instructor',
  'time',
  'location',
  'similar_course',
  'price_drop',
  'availability',
] as const;

// User course preferences table for storing likes and recommendation preferences
export const userCoursePreferences = pgTable('user_course_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  sourceEventId: integer('source_event_id').references(() => calendarEvents.id).notNull(),
  instructorId: integer('instructor_id').references(() => users.id),
  preferredTimeStart: time('preferred_time_start'),
  preferredTimeEnd: time('preferred_time_end'),
  preferredDays: array('preferred_days').element(integer), // Array of days (1-7)
  locationId: integer('location_id').references(() => locations.id),
  activityType: varchar('activity_type', { length: 255 }),
  maxPrice: decimal('max_price', { precision: 10, scale: 2 }),
  socialData: jsonb('social_data'), // For storing Facebook/Google interests
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  // Add a unique constraint to prevent duplicate likes
  uniquePreference: unique().on(userId, sourceEventId),
});

// Preference features table for ML processing
export const preferenceFeatures = pgTable('preference_features', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  featureVector: jsonb('feature_vector').$type<number[]>(), // Will be integrated with pgvector
  featureMetadata: jsonb('feature_metadata'),
  trainingData: jsonb('training_data'), // Store training data for on-device learning
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // Add a unique constraint for one feature vector per user
  uniqueUserFeatures: unique().on(userId),
});

// Course recommendations table for storing generated recommendations
export const courseRecommendations = pgTable('course_recommendations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  eventId: integer('event_id').references(() => calendarEvents.id).notNull(),
  score: decimal('score', { precision: 5, scale: 4 }).notNull(),
  similarityScore: decimal('similarity_score', { precision: 5, scale: 4 }),
  recommendationReason: jsonb('recommendation_reason'),
  recommendationType: varchar('recommendation_type', { length: 50 }).$type<typeof recommendationTypeEnum[number]>().notNull(),
  notified: boolean('notified').default(false).notNull(),
  notificationSentAt: timestamp('notification_sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // Add a unique constraint for user-event recommendation pairs
  uniqueRecommendation: unique().on(userId, eventId),
});

export type User = InferModel<typeof users>;
export type Listing = InferModel<typeof listings>;
export type Location = InferModel<typeof locations>;
export type CalendarEvent = InferModel<typeof calendarEvents>;
export type RecurringPattern = InferModel<typeof recurringPatterns>;
export type EventParticipant = InferModel<typeof eventParticipants>;
export type UserCoursePreference = InferModel<typeof userCoursePreferences>;
export type PreferenceFeature = InferModel<typeof preferenceFeatures>;
export type CourseRecommendation = InferModel<typeof courseRecommendations>;
