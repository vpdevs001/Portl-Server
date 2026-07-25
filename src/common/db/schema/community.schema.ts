import { pgTable, text, timestamp, unique, uuid, varchar, index } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';
import { societies, flats } from './identity.schema';
import { complaintCategoryEnum, complaintStatusEnum, noticeCategoryEnum } from './enums';

export const notices = pgTable(
  'notices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    societyId: uuid('society_id')
      .notNull()
      .references(() => societies.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => user.id),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    category: noticeCategoryEnum('category').notNull().default('general'),
    // Null = stays visible indefinitely. Once set and passed, the notice is
    // filtered out of the default feed (see notices.service.ts) rather than
    // deleted outright — admins can still reach it via ?includeExpired=true.
    expiresAt: timestamp('expires_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => [index('notices_society_id_idx').on(table.societyId)]
);

export const polls = pgTable(
  'polls',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    societyId: uuid('society_id')
      .notNull()
      .references(() => societies.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => user.id),
    question: text('question').notNull(),
    startsAt: timestamp('starts_at').notNull(),
    endsAt: timestamp('ends_at').notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => [index('polls_society_id_idx').on(table.societyId)]
);

export const pollOptions = pgTable('poll_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  pollId: uuid('poll_id')
    .notNull()
    .references(() => polls.id, { onDelete: 'cascade' }),
  optionText: varchar('option_text', { length: 255 }).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
});

export const pollVotes = pgTable(
  'poll_votes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pollId: uuid('poll_id')
      .notNull()
      .references(() => polls.id, { onDelete: 'cascade' }),
    pollOptionId: uuid('poll_option_id')
      .notNull()
      .references(() => pollOptions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [
    // One vote per resident per poll (plan.md Chapter 11). The atomic insert
    // in polls.service.ts relies on the DB rejecting a second row for the
    // same (pollId, userId) rather than a check-then-insert race.
    unique('poll_votes_poll_id_user_id_unique').on(table.pollId, table.userId)
  ]
);

export const complaints = pgTable(
  'complaints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    societyId: uuid('society_id')
      .notNull()
      .references(() => societies.id, { onDelete: 'cascade' }),
    flatId: uuid('flat_id')
      .notNull()
      .references(() => flats.id, { onDelete: 'cascade' }),
    raisedBy: uuid('raised_by')
      .notNull()
      .references(() => user.id),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    category: complaintCategoryEnum('category').notNull().default('general'),
    status: complaintStatusEnum('status').notNull().default('open'),
    // Optional resident-attached photo, same base64-upload pattern as
    // visitor photos (Chapter 7) — uploaded via POST /api/upload.
    photoUrl: varchar('photo_url', { length: 2048 }),
    // Admin's resolution notes, appended when the status is updated
    // (complaints.service.ts). Null until an admin first responds.
    adminComments: text('admin_comments'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => [
    index('complaints_society_id_idx').on(table.societyId),
    index('complaints_flat_id_idx').on(table.flatId)
  ]
);
