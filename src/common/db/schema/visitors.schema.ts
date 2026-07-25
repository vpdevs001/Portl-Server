import { pgTable, text, timestamp, uuid, varchar, unique, index } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';
import { societies, flats } from './identity.schema';
import { approverTypeEnum, visitorSourceEnum, visitorStatusEnum, visitorTypeEnum } from './enums';

export const visitorRequests = pgTable(
  'visitor_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    societyId: uuid('society_id')
      .notNull()
      .references(() => societies.id, { onDelete: 'cascade' }),
    flatId: uuid('flat_id').references(() => flats.id, { onDelete: 'set null' }),
    visitorType: visitorTypeEnum('visitor_type').notNull(),
    approverType: approverTypeEnum('approver_type').notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    photo: text('photo'),
    purpose: text('purpose'),
    // Non-cab vehicle plate (e.g. a delivery rider's bike). Cab plate numbers
    // live on cabDetails.vehicleNumber instead — kept separate since a cab's
    // plate is tied to the cab company/driver pairing, not the visit itself.
    vehicleNumber: varchar('vehicle_number', { length: 30 }),
    status: visitorStatusEnum('status').notNull().default('pending'),
    source: visitorSourceEnum('source').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => user.id),
    approvedBy: uuid('approved_by').references(() => user.id),

    // Chapter 8 — Pre-Approvals. Populated only when `source = 'pre_approval'`
    // (always paired with `approver_type = 'resident'` — pre-approvals are
    // flat-scoped, never admin-routed). `passCode` is a 6-char alphanumeric
    // code the guard can key in by hand if the QR scan fails; validity window
    // bounds when `verify-pass` will accept it.
    passCode: varchar('pass_code', { length: 6 }),
    validFrom: timestamp('valid_from'),
    validUntil: timestamp('valid_until'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => [
    // Postgres unique constraints don't count NULLs as duplicates, so this
    // only ever constrains actual pre-approval rows — regular gate-originated
    // requests (passCode null) are unaffected.
    unique('visitor_requests_society_id_pass_code_unique').on(table.societyId, table.passCode),
    // Chapter 17 — "pending requests for my society" (5s poll fallback from
    // Chapter 7, plus every push-fanout lookup) is the single hottest query
    // in the app, hence the composite rather than relying on the single-
    // column societyId index below for it.
    index('visitor_requests_society_id_status_idx').on(table.societyId, table.status),
    index('visitor_requests_society_id_idx').on(table.societyId),
    index('visitor_requests_flat_id_idx').on(table.flatId)
  ]
);

export const deliveryDetails = pgTable('delivery_details', {
  id: uuid('id').primaryKey().defaultRandom(),
  visitorRequestId: uuid('visitor_request_id')
    .notNull()
    .references(() => visitorRequests.id, { onDelete: 'cascade' }),
  companyName: varchar('company_name', { length: 150 }).notNull(),
  orderId: varchar('order_id', { length: 100 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
});

export const cabDetails = pgTable('cab_details', {
  id: uuid('id').primaryKey().defaultRandom(),
  visitorRequestId: uuid('visitor_request_id')
    .notNull()
    .references(() => visitorRequests.id, { onDelete: 'cascade' }),
  providerName: varchar('provider_name', { length: 150 }).notNull(),
  vehicleNumber: varchar('vehicle_number', { length: 30 }),
  driverName: varchar('driver_name', { length: 150 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
});

export const serviceStaffDetails = pgTable('service_staff_details', {
  id: uuid('id').primaryKey().defaultRandom(),
  visitorRequestId: uuid('visitor_request_id')
    .notNull()
    .references(() => visitorRequests.id, { onDelete: 'cascade' }),
  serviceType: varchar('service_type', { length: 100 }).notNull(),
  companyName: varchar('company_name', { length: 150 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
});

// Pulled forward from Chapter 16 — this chapter (Visitor Management) is the
// first thing that actually needs to send a push notification, so the
// minimal token table + registration endpoint land here. Chapter 16 later
// hardens this (expired-token cleanup, batching) rather than building it
// from scratch.
export const pushTokens = pgTable(
  'push_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    expoPushToken: varchar('expo_push_token', { length: 255 }).notNull(),
    deviceId: varchar('device_id', { length: 255 }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => [
    unique('push_tokens_user_id_expo_push_token_unique').on(table.userId, table.expoPushToken)
  ]
);
