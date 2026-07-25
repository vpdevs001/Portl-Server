import { pgTable, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';
import { societies, flats } from './identity.schema';
import { userRoleEnum, inviteStatusEnum } from './enums';

export const societyInvites = pgTable(
  'society_invites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    societyId: uuid('society_id')
      .notNull()
      .references(() => societies.id, { onDelete: 'cascade' }),
    invitedUserId: uuid('invited_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: userRoleEnum('role').notNull(),
    flatId: uuid('flat_id').references(() => flats.id, { onDelete: 'cascade' }),
    status: inviteStatusEnum('status').notNull().default('pending'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => [
    index('society_invites_society_id_idx').on(table.societyId),
    index('society_invites_invited_user_id_idx').on(table.invitedUserId)
  ]
);
