import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  index
} from 'drizzle-orm/pg-core';
import { user } from './auth.schema';
import { societies, flats } from './identity.schema';
import { bookingStatusEnum } from './enums';

export const amenities = pgTable(
  'amenities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    societyId: uuid('society_id')
      .notNull()
      .references(() => societies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 150 }).notNull(),
    description: text('description'),
    capacity: integer('capacity'),
    // Soft-disable instead of delete — an amenity taken offline for
    // maintenance shouldn't orphan its historical bookings (mirrors the
    // is_active pattern used by staff_directory, Chapter 14).
    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => [index('amenities_society_id_idx').on(table.societyId)]
);

export const amenityBookings = pgTable(
  'amenity_bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    amenityId: uuid('amenity_id')
      .notNull()
      .references(() => amenities.id, { onDelete: 'cascade' }),
    flatId: uuid('flat_id')
      .notNull()
      .references(() => flats.id, { onDelete: 'cascade' }),
    bookedBy: uuid('booked_by')
      .notNull()
      .references(() => user.id),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time').notNull(),
    status: bookingStatusEnum('status').notNull().default('pending'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => [
    index('amenity_bookings_amenity_id_idx').on(table.amenityId),
    index('amenity_bookings_flat_id_idx').on(table.flatId)
  ]
);
