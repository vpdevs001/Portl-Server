import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  numeric,
  index
} from 'drizzle-orm/pg-core';
import { flatTypeEnum } from './enums';

export const societies = pgTable('societies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address').notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  pincode: varchar('pincode', { length: 20 }).notNull(),

  // The single UPI VPA residents pay maintenance dues into (Chapter 15).
  // Belongs to the society, not any individual admin, so it stays stable
  // across admin handovers (e.g. yearly treasurer rotation).
  upiId: varchar('upi_id', { length: 100 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
});

export const towers = pgTable(
  'towers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    societyId: uuid('society_id')
      .notNull()
      .references(() => societies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => [index('towers_society_id_idx').on(table.societyId)]
);

export const flats = pgTable(
  'flats',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    societyId: uuid('society_id')
      .notNull()
      .references(() => societies.id, { onDelete: 'cascade' }),
    towerId: uuid('tower_id')
      .notNull()
      .references(() => towers.id, { onDelete: 'cascade' }),
    flatNumber: varchar('flat_number', { length: 20 }).notNull(),
    floor: integer('floor'),
    // Chapter 15 — set by the admin when the flat is created, editable
    // later. Drives the amount used each time a monthly due is
    // materialized for this flat; changing it only affects future dues,
    // past ones keep their original snapshot.
    flatType: flatTypeEnum('flat_type').notNull().default('1bhk'),
    monthlyAmount: numeric('monthly_amount', { precision: 10, scale: 2 }).notNull().default('0'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => [
    index('flats_society_id_idx').on(table.societyId),
    index('flats_tower_id_idx').on(table.towerId)
  ]
);
