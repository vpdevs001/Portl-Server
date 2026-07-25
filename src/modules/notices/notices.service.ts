import { and, eq } from 'drizzle-orm';
import { db } from '../../common/db';
import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { notices } from '../../common/db/schema';
import { sendPushToUsers } from '../../common/services/push.service';
import type {
  Caller,
  CreateNoticeInput,
  EmergencyAlertInput,
  ListNoticesQuery,
  UpdateNoticeInput
} from './notices.types';

export async function createNotice(caller: Caller, dto: CreateNoticeInput) {
  const [created] = await db
    .insert(notices)
    .values({
      societyId: caller.societyId,
      createdBy: caller.id,
      title: dto.title,
      description: dto.description,
      category: dto.category ?? 'general',
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null
    })
    .returning();

  if (!created) {
    throw new AppError(500, ERROR_CODES.DATABASE_ERROR, 'Failed to create notice');
  }

  // Fire-and-forget, mirroring the visitor-request notify pattern (Chapter
  // 7): never blocks/fails the response if the push itself fails.
  void notifySociety(created).catch(() => undefined);

  return created;
}

// Chapter 17 — guard-triggered broadcast. Reuses the notices table/feed
// (category: 'emergency' was already reserved in the enum since Chapter
// 10, just never had a way to be created) rather than standing up a
// parallel alerting system, so it shows up in the same notice feed
// residents/admins already check, just with urgent copy in the push.
export async function createEmergencyAlert(caller: Caller, dto: EmergencyAlertInput) {
  const [created] = await db
    .insert(notices)
    .values({
      societyId: caller.societyId,
      createdBy: caller.id,
      title: dto.title,
      description: dto.description,
      category: 'emergency',
      expiresAt: null
    })
    .returning();

  if (!created) {
    throw new AppError(500, ERROR_CODES.DATABASE_ERROR, 'Failed to create emergency alert');
  }

  void notifySociety(created, { urgent: true }).catch(() => undefined);

  return created;
}

async function notifySociety(notice: typeof notices.$inferSelect, options?: { urgent?: boolean }) {
  const recipients = await db.query.user.findMany({
    where: { societyId: notice.societyId },
    columns: { id: true }
  });

  await sendPushToUsers(
    recipients.map((row) => row.id),
    {
      title: options?.urgent ? `🚨 Emergency alert: ${notice.title}` : 'New society notice',
      body: options?.urgent ? notice.description : notice.title,
      screen: '/(app)/notices',
      params: { noticeId: notice.id }
    }
  );
}

// Default feed: expires_at IS NULL OR expires_at > now() — expired notices
// are filtered out of the normal read rather than deleted, so an admin can
// still reach them via includeExpired. Only admins can request that, so a
// resident/guard can never see a notice past its stated expiry.
export async function listNotices(caller: Caller, query: ListNoticesQuery) {
  const includeExpired = caller.role === 'society_admin' && Boolean(query.includeExpired);

  return await db.query.notices.findMany({
    where: includeExpired
      ? { societyId: caller.societyId }
      : {
          societyId: caller.societyId,
          OR: [{ expiresAt: { isNull: true } }, { expiresAt: { gt: new Date() } }]
        },
    with: {
      createdByUser: { columns: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
}

async function findNoticeInSociety(noticeId: string, societyId: string) {
  const notice = await db.query.notices.findFirst({
    where: { id: noticeId, societyId }
  });

  if (!notice) {
    throw AppError.notFound('Notice not found');
  }

  return notice;
}

export async function updateNotice(caller: Caller, noticeId: string, dto: UpdateNoticeInput) {
  await findNoticeInSociety(noticeId, caller.societyId);

  const [updated] = await db
    .update(notices)
    .set({
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.category !== undefined ? { category: dto.category } : {}),
      // Explicit null clears the expiry; omitted leaves the column alone.
      ...(dto.expiresAt !== undefined
        ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null }
        : {})
    })
    .where(and(eq(notices.id, noticeId), eq(notices.societyId, caller.societyId)))
    .returning();

  if (!updated) {
    throw AppError.notFound('Notice not found');
  }

  return updated;
}

export async function deleteNotice(caller: Caller, noticeId: string) {
  await findNoticeInSociety(noticeId, caller.societyId);

  await db
    .delete(notices)
    .where(and(eq(notices.id, noticeId), eq(notices.societyId, caller.societyId)));
}
