import { and, eq } from 'drizzle-orm';
import { db } from '../../common/db';
import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { complaints } from '../../common/db/schema';
import { sendPushToUsers } from '../../common/services/push.service';
import type { Caller, CreateComplaintInput, UpdateComplaintStatusInput } from './complaints.types';

export async function createComplaint(caller: Caller, dto: CreateComplaintInput) {
  if (!caller.flatId) {
    throw AppError.forbidden('You are not assigned to a flat');
  }

  const [created] = await db
    .insert(complaints)
    .values({
      societyId: caller.societyId,
      flatId: caller.flatId,
      raisedBy: caller.id,
      title: dto.title,
      description: dto.description,
      category: dto.category ?? 'general',
      photoUrl: dto.photoUrl ?? null
    })
    .returning();

  if (!created) {
    throw new AppError(500, ERROR_CODES.DATABASE_ERROR, 'Failed to create complaint');
  }

  return created;
}

// Residents see every complaint raised against their own flat (not just
// their own — a flat can have several residents); admins see the whole
// society's helpdesk queue for triage. Anyone else (e.g. a guard with no
// flat) only ever sees complaints they personally raised, which in
// practice is none — guards can't create complaints (see complaints.routes.ts).
export async function listComplaints(caller: Caller) {
  if (caller.role === 'society_admin') {
    return await db.query.complaints.findMany({
      where: { societyId: caller.societyId },
      with: {
        flat: true,
        raisedByUser: { columns: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  if (caller.flatId) {
    return await db.query.complaints.findMany({
      where: { societyId: caller.societyId, flatId: caller.flatId },
      with: {
        flat: true,
        raisedByUser: { columns: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  return await db.query.complaints.findMany({
    where: { societyId: caller.societyId, raisedBy: caller.id },
    with: {
      flat: true,
      raisedByUser: { columns: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
}

async function findComplaintInSociety(complaintId: string, societyId: string) {
  const complaint = await db.query.complaints.findFirst({
    where: { id: complaintId, societyId }
  });

  if (!complaint) {
    throw AppError.notFound('Complaint not found');
  }

  return complaint;
}

export async function updateComplaintStatus(
  caller: Caller,
  complaintId: string,
  dto: UpdateComplaintStatusInput
) {
  await findComplaintInSociety(complaintId, caller.societyId);

  const [updated] = await db
    .update(complaints)
    .set({
      status: dto.status,
      // Explicit note replaces the previous one; omitted leaves whatever
      // was recorded before untouched (an admin can flip status without
      // re-typing an unrelated comment).
      ...(dto.adminComments !== undefined ? { adminComments: dto.adminComments } : {})
    })
    .where(and(eq(complaints.id, complaintId), eq(complaints.societyId, caller.societyId)))
    .returning();

  if (!updated) {
    throw AppError.notFound('Complaint not found');
  }

  // Fire-and-forget, mirroring the notices push pattern (Chapter 10): never
  // blocks/fails the response if the push itself fails.
  void notifyReporter(updated).catch(() => undefined);

  return updated;
}

async function notifyReporter(complaint: typeof complaints.$inferSelect) {
  const statusLabel = complaint.status.replace('_', ' ');

  await sendPushToUsers([complaint.raisedBy], {
    title: 'Your complaint was updated',
    body: `"${complaint.title}" is now ${statusLabel}`,
    screen: '/(app)/complaints',
    params: { complaintId: complaint.id }
  });
}
