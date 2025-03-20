import { pgTable, serial, text, varchar, timestamp, integer, decimal } from 'drizzle-orm/pg-core';
import { InferModel } from 'drizzle-orm';

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

export type User = InferModel<typeof users>;
export type Listing = InferModel<typeof listings>;
