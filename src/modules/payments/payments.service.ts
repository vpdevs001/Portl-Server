import { and, eq } from 'drizzle-orm';
import { db } from '../../common/db';
import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { maintenanceDues, paymentConfirmations } from '../../common/db/schema';
import { sendPushToUsers } from '../../common/services/push.service';
import { uploadToImageKit } from '../../lib/imagekit';
import type {
  Caller,
  ConfirmPaymentInput,
  ListDuesQuery,
  SetDueStatusInput,
  VerifyPaymentInput
} from './payments.types';

// ─── Current-period helpers ─────────────────────────────────────────────────

// "YYYY-MM" for the current calendar month. Every due is keyed by this, so
// the moment a new month starts, there simply isn't a row yet for it —
// the next read materializes a fresh 'pending' due automatically. No cron,
// no explicit "generate bills" step.
function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function ensureDueForFlat(societyId: string, flatId: string) {
  const period = currentPeriod();

  const existing = await db.query.maintenanceDues.findFirst({
    where: { flatId, period }
  });
  if (existing) return existing;

  const flat = await db.query.flats.findFirst({ where: { id: flatId, societyId } });
  if (!flat) {
    throw AppError.notFound('Flat not found');
  }

  const [created] = await db
    .insert(maintenanceDues)
    .values({
      societyId,
      flatId,
      period,
      amount: flat.monthlyAmount,
      status: 'pending'
    })
    // Guards against a race where two requests both find no existing row
    // and both try to create one — the unique (flatId, period) constraint
    // makes the second insert a no-op instead of an error.
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  // Someone else won the race — read back what they created.
  const winner = await db.query.maintenanceDues.findFirst({ where: { flatId, period } });
  if (!winner) {
    throw new AppError(500, ERROR_CODES.DATABASE_ERROR, 'Failed to materialize due');
  }
  return winner;
}

// A flat only "counts" for billing once someone actually lives there — a
// resident user whose flatId points at it. Newly-added flats with no
// resident assigned yet shouldn't accrue maintenance dues nobody can pay.
async function getOccupiedFlatIds(societyId: string): Promise<Set<string>> {
  const residents = await db.query.user.findMany({
    where: { societyId, role: 'resident' },
    columns: { flatId: true }
  });
  return new Set(residents.map((r) => r.flatId).filter((flatId): flatId is string => !!flatId));
}

async function ensureDuesForSociety(societyId: string) {
  const period = currentPeriod();

  const flats = await db.query.flats.findMany({
    where: { societyId },
    columns: { id: true, monthlyAmount: true }
  });
  if (flats.length === 0) return;

  const occupiedFlatIds = await getOccupiedFlatIds(societyId);
  const occupiedFlats = flats.filter((f) => occupiedFlatIds.has(f.id));
  if (occupiedFlats.length === 0) return;

  const existing = await db.query.maintenanceDues.findMany({
    where: { societyId, period },
    columns: { flatId: true }
  });
  const existingFlatIds = new Set(existing.map((d) => d.flatId));

  const missing = occupiedFlats.filter((f) => !existingFlatIds.has(f.id));
  if (missing.length === 0) return;

  await db
    .insert(maintenanceDues)
    .values(
      missing.map((flat) => ({
        societyId,
        flatId: flat.id,
        period,
        amount: flat.monthlyAmount,
        status: 'pending' as const
      }))
    )
    .onConflictDoNothing();
}

// ─── Dues ───────────────────────────────────────────────────────────────────

export async function listDues(caller: Caller, query: ListDuesQuery) {
  const period = currentPeriod();

  if (caller.role === 'society_admin') {
    await ensureDuesForSociety(caller.societyId);

    return await db.query.maintenanceDues.findMany({
      where: {
        societyId: caller.societyId,
        period,
        ...(query.status ? { status: query.status } : {})
      },
      with: {
        flat: true,
        paymentConfirmations: {
          orderBy: { createdAt: 'desc' },
          limit: 1,
          with: { raisedByUser: true }
        }
      },
      orderBy: { flatId: 'asc' }
    });
  }

  if (!caller.flatId) {
    return [];
  }

  await ensureDueForFlat(caller.societyId, caller.flatId);

  return await db.query.maintenanceDues.findMany({
    where: {
      societyId: caller.societyId,
      flatId: caller.flatId,
      period,
      ...(query.status ? { status: query.status } : {})
    },
    with: {
      flat: true,
      paymentConfirmations: { orderBy: { createdAt: 'desc' }, limit: 1 }
    }
  });
}

async function findDueInSociety(dueId: string, societyId: string) {
  const due = await db.query.maintenanceDues.findFirst({
    where: { id: dueId, societyId }
  });

  if (!due) {
    throw AppError.notFound('Maintenance due not found');
  }

  return due;
}

export async function setDueStatus(caller: Caller, dueId: string, dto: SetDueStatusInput) {
  const due = await findDueInSociety(dueId, caller.societyId);

  const [updated] = await db
    .update(maintenanceDues)
    .set({ status: dto.status })
    .where(eq(maintenanceDues.id, due.id))
    .returning();

  if (!updated) {
    throw new AppError(500, ERROR_CODES.DATABASE_ERROR, 'Failed to update due');
  }

  return updated;
}

// ─── Payment confirmations ──────────────────────────────────────────────────

export async function confirmPayment(caller: Caller, dto: ConfirmPaymentInput) {
  if (!caller.flatId) {
    throw AppError.forbidden('You are not assigned to a flat');
  }

  const due = await findDueInSociety(dto.dueId, caller.societyId);

  if (due.flatId !== caller.flatId) {
    throw AppError.forbidden('This due does not belong to your flat');
  }

  if (due.status === 'paid') {
    throw AppError.conflict('This due has already been marked as paid');
  }
  if (due.status === 'review') {
    throw AppError.conflict('A payment proof for this due is already under review');
  }

  const uploaded = await uploadToImageKit({
    base64: dto.screenshot,
    fileName: `payment-${dto.dueId}-${Date.now()}.jpg`,
    folder: 'payments'
  });

  const created = await db.transaction(async (tx) => {
    const [confirmation] = await tx
      .insert(paymentConfirmations)
      .values({
        dueId: dto.dueId,
        flatId: caller.flatId as string,
        raisedBy: caller.id,
        amount: dto.amount.toFixed(2),
        screenshot: uploaded.url,
        upiRef: dto.upiRef ?? null,
        status: 'pending'
      })
      .returning();

    if (!confirmation) {
      throw new AppError(500, ERROR_CODES.DATABASE_ERROR, 'Failed to save payment confirmation');
    }

    await tx
      .update(maintenanceDues)
      .set({ status: 'review' })
      .where(eq(maintenanceDues.id, due.id));

    return confirmation;
  });

  // Fire-and-forget, same pattern as visitor requests / complaints —
  // never blocks the response if the push itself fails.
  void notifyAdmins(caller.societyId, due.period).catch(() => undefined);

  return created;
}

export async function verifyPayment(
  caller: Caller,
  confirmationId: string,
  dto: VerifyPaymentInput
) {
  const confirmation = await db.query.paymentConfirmations.findFirst({
    where: { id: confirmationId, due: { societyId: caller.societyId } }
  });

  if (!confirmation) {
    throw AppError.notFound('Payment confirmation not found');
  }

  if (confirmation.status !== 'pending') {
    throw AppError.conflict('This payment confirmation has already been reviewed');
  }

  const updated = await db.transaction(async (tx) => {
    const [updatedConfirmation] = await tx
      .update(paymentConfirmations)
      .set({
        status: dto.status,
        reviewedBy: caller.id,
        rejectionReason: dto.status === 'rejected' ? (dto.rejectionReason ?? null) : null
      })
      .where(eq(paymentConfirmations.id, confirmationId))
      .returning();

    if (!updatedConfirmation) {
      throw new AppError(500, ERROR_CODES.DATABASE_ERROR, 'Failed to update payment confirmation');
    }

    // Approve → paid. Reject → back to pending so the resident can
    // resubmit. Either way this resolves the 'review' state.
    await tx
      .update(maintenanceDues)
      .set({ status: dto.status === 'approved' ? 'paid' : 'pending' })
      .where(
        and(
          eq(maintenanceDues.id, updatedConfirmation.dueId),
          eq(maintenanceDues.societyId, caller.societyId)
        )
      );

    return updatedConfirmation;
  });

  void notifyResident(updated).catch(() => undefined);

  return updated;
}

// ─── Notifications ──────────────────────────────────────────────────────────

async function notifyAdmins(societyId: string, period: string) {
  const admins = await db.query.user.findMany({
    where: { societyId, role: 'society_admin' },
    columns: { id: true }
  });

  await sendPushToUsers(
    admins.map((a) => a.id),
    {
      title: 'New payment confirmation',
      body: `A resident submitted a payment proof for ${period}`,
      screen: '/(app)/admin/payments/review',
      params: {}
    }
  );
}

async function notifyResident(confirmation: typeof paymentConfirmations.$inferSelect) {
  const approved = confirmation.status === 'approved';

  await sendPushToUsers([confirmation.raisedBy], {
    title: approved ? 'Payment verified' : 'Payment rejected',
    body: approved
      ? 'Your maintenance payment has been confirmed as paid.'
      : `Your payment proof was rejected${confirmation.rejectionReason ? `: ${confirmation.rejectionReason}` : '.'}`,
    screen: '/(app)/payments',
    params: { dueId: confirmation.dueId }
  });
}
