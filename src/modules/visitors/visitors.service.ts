import { randomInt } from 'node:crypto';
import { and, eq, isNull, lt } from 'drizzle-orm';
import { db } from '../../common/db';
import { AppError } from '../../common/errors/app-error';
import { sendPushToUsers } from '../../common/services/push.service';
import { uploadToImageKit } from '../../lib/imagekit';
import {
  cabDetails,
  deliveryDetails,
  serviceStaffDetails,
  visitorEntryLogs,
  visitorRequests
} from '../../common/db/schema';
import type {
  CreatePreApprovalInput,
  CreateVisitorRequestInput,
  RespondVisitorRequestInput,
  UploadVisitorPhotoInput,
  VerifyPassInput
} from './visitors.types.ts';

type CallerRole = 'resident' | 'security_guard' | 'society_admin';

type Caller = {
  id: string;
  societyId: string;
  role: CallerRole;
  flatId?: string | null;
};

// A guard-initiated request left untouched this long is treated as expired
// on the next read, rather than sitting `pending` forever. See plan.md
// Chapter 7 — deliberately a lazy check-on-read, not a scheduled job.
const PENDING_EXPIRY_MINUTES = 30;

export async function createVisitorRequest(
  societyId: string,
  createdBy: string,
  dto: CreateVisitorRequestInput
) {
  const request = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(visitorRequests)
      .values({
        societyId,
        flatId: dto.flatId ?? null,
        visitorType: dto.visitorType,
        approverType: dto.approverType ?? 'resident',
        name: dto.name,
        phone: dto.phone ?? null,
        photo: dto.photo ?? null,
        purpose: dto.purpose ?? null,
        vehicleNumber: dto.vehicleNumber ?? null,
        status: 'pending',
        source: dto.source ?? 'guard_request',
        createdBy
      })
      .returning();

    if (!created) {
      throw new AppError(500, 'DATABASE_ERROR', 'Failed to create visitor request');
    }

    if (dto.visitorType === 'delivery') {
      await tx.insert(deliveryDetails).values({
        visitorRequestId: created.id,
        companyName: dto.details?.companyName ?? dto.details?.company ?? 'Unknown',
        orderId: dto.details?.orderId ?? null
      });
    }

    if (dto.visitorType === 'cab') {
      await tx.insert(cabDetails).values({
        visitorRequestId: created.id,
        providerName: dto.details?.providerName ?? dto.details?.company ?? 'Unknown',
        vehicleNumber: dto.details?.vehicleNumber ?? null,
        driverName: dto.details?.driverName ?? null
      });
    }

    if (dto.visitorType === 'service_staff') {
      await tx.insert(serviceStaffDetails).values({
        visitorRequestId: created.id,
        serviceType: dto.details?.serviceType ?? 'Service',
        companyName: dto.details?.companyName ?? dto.details?.company ?? null
      });
    }

    return created;
  });

  // Fire-and-forget: routes to the flat's residents, or to every society
  // admin, depending on approverType. Never blocks/fails the response —
  // the client's 5s poll is the fallback if this doesn't land.
  void notifyApprovers(request).catch(() => undefined);

  return request;
}

async function notifyApprovers(request: typeof visitorRequests.$inferSelect) {
  const recipientIds =
    request.approverType === 'admin'
      ? (
          await db.query.user.findMany({
            where: { societyId: request.societyId, role: 'society_admin' },
            columns: { id: true }
          })
        ).map((row) => row.id)
      : request.flatId
        ? (
            await db.query.user.findMany({
              where: { flatId: request.flatId! },
              columns: { id: true }
            })
          ).map((row) => row.id)
        : [];

  await sendPushToUsers(recipientIds, {
    title: 'New visitor at the gate',
    body: `${request.name} is waiting — ${request.visitorType.replace('_', ' ')}`,
    screen: '/(app)/home',
    params: { requestId: request.id }
  });
}

async function expirePendingRequests(societyId: string) {
  const cutoff = new Date(Date.now() - PENDING_EXPIRY_MINUTES * 60_000);

  await db
    .update(visitorRequests)
    .set({ status: 'expired' })
    .where(
      and(
        eq(visitorRequests.societyId, societyId),
        eq(visitorRequests.status, 'pending'),
        lt(visitorRequests.createdAt, cutoff)
      )
    );
}

export async function listPendingRequests(caller: Caller) {
  await expirePendingRequests(caller.societyId);

  if (caller.role === 'security_guard') {
    // Guard sees every pending request at the gate, regardless of who it
    // routes to.
    return await db.query.visitorRequests.findMany({
      where: { societyId: caller.societyId, status: 'pending' },
      with: {
        deliveryDetails: true,
        cabDetails: true,
        serviceStaffDetails: true,
        createdByUser: true,
        flat: true
      },
      orderBy: (r, { desc }) => [desc(r.createdAt)]
    });
  }

  if (caller.role === 'society_admin') {
    return await db.query.visitorRequests.findMany({
      where: { societyId: caller.societyId, status: 'pending', approverType: 'admin' },
      with: {
        deliveryDetails: true,
        cabDetails: true,
        serviceStaffDetails: true,
        createdByUser: true,
        flat: true
      },
      orderBy: (r, { desc }) => [desc(r.createdAt)]
    });
  }

  // Resident: only requests routed to their own flat.
  if (!caller.flatId) {
    return [];
  }

  return await db.query.visitorRequests.findMany({
    where: {
      societyId: caller.societyId,
      status: 'pending',
      approverType: 'resident',
      flatId: caller.flatId!
    },
    with: {
      deliveryDetails: true,
      cabDetails: true,
      serviceStaffDetails: true,
      createdByUser: true,
      flat: true
    },
    orderBy: (r, { desc }) => [desc(r.createdAt)]
  });
}

export async function respondToVisitorRequest(
  caller: Caller,
  requestId: string,
  dto: RespondVisitorRequestInput
) {
  return await db.transaction(async (tx) => {
    const conditions = [
      eq(visitorRequests.id, requestId),
      eq(visitorRequests.status, 'pending'),
      eq(visitorRequests.societyId, caller.societyId)
    ];

    // Bake the caller's own authorization directly into the WHERE clause
    // (Chapter 5's hybrid tenant-scoping pattern) rather than fetch-then-
    // check: a resident can only resolve their own flat's resident-routed
    // requests; an admin can only resolve admin-routed requests.
    if (caller.role === 'resident') {
      if (!caller.flatId) {
        throw AppError.forbidden('You are not assigned to a flat');
      }
      conditions.push(eq(visitorRequests.approverType, 'resident'));
      conditions.push(eq(visitorRequests.flatId, caller.flatId));
    } else if (caller.role === 'society_admin') {
      conditions.push(eq(visitorRequests.approverType, 'admin'));
    } else {
      throw AppError.forbidden('Only residents and admins can respond to visitor requests');
    }

    const [updated] = await tx
      .update(visitorRequests)
      .set({ status: dto.status, approvedBy: caller.id })
      .where(and(...conditions))
      .returning();

    if (!updated) {
      throw AppError.conflict(
        'This request has already been handled, expired, or does not belong to you.'
      );
    }

    return updated;
  });
}

// Guest check-in: a guest (whether resident/admin-approved via the normal
// flow, or pre-approved via passcode) moves visitor_requests.status through
// approved -> checked_in -> completed as the guard logs entry/exit. The
// `checked_in` status is what /api/visitors/checked-in reads — a guest is
// "in the guest check-in list" exactly while status = 'checked_in', and
// leaves it the moment exit is logged. Both transitions are baked directly
// into the UPDATE's WHERE clause (Chapter 5's direct-society_id pattern)
// so the status flip and the row-ownership/state check happen atomically
// in one statement, inside a transaction with the entry-log write.
export async function logEntry(societyId: string, userId: string, requestId: string) {
  return await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(visitorRequests)
      .set({ status: 'checked_in' })
      .where(
        and(
          eq(visitorRequests.id, requestId),
          eq(visitorRequests.societyId, societyId),
          eq(visitorRequests.status, 'approved')
        )
      )
      .returning({ id: visitorRequests.id });

    if (!updated) {
      // Status condition didn't match — figure out why so the guard gets a
      // useful error instead of a generic 409.
      const existing = await tx.query.visitorRequests.findFirst({
        where: { id: requestId, societyId },
        columns: { id: true, status: true }
      });

      if (!existing) {
        throw AppError.notFound('Visitor request not found');
      }
      if (existing.status === 'checked_in') {
        throw AppError.conflict('This visitor has already been checked in');
      }
      throw AppError.conflict('This visitor request must be approved before entry can be logged');
    }

    const [entry] = await tx
      .insert(visitorEntryLogs)
      .values({
        visitorRequestId: requestId,
        entryTime: new Date(),
        entryMarkedBy: userId
      })
      .returning();

    return entry;
  });
}

export async function logExit(societyId: string, userId: string, requestId: string) {
  return await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(visitorRequests)
      .set({ status: 'completed' })
      .where(
        and(
          eq(visitorRequests.id, requestId),
          eq(visitorRequests.societyId, societyId),
          eq(visitorRequests.status, 'checked_in')
        )
      )
      .returning({ id: visitorRequests.id });

    if (!updated) {
      const existing = await tx.query.visitorRequests.findFirst({
        where: { id: requestId, societyId },
        columns: { id: true, status: true }
      });

      if (!existing) {
        throw AppError.notFound('Visitor request not found');
      }
      throw AppError.conflict('This visitor is not currently checked in');
    }

    const [entry] = await tx
      .update(visitorEntryLogs)
      .set({
        exitTime: new Date(),
        exitMarkedBy: userId
      })
      .where(
        and(eq(visitorEntryLogs.visitorRequestId, requestId), isNull(visitorEntryLogs.exitTime))
      )
      .returning();

    if (!entry) {
      throw AppError.notFound('No open entry log found for this visitor request');
    }

    return entry;
  });
}

// Backs GET /api/visitors/checked-in — the "guest check-in" list the gate
// screen shows. A single relational query (RQBv2 batches the nested `with`
// relations rather than issuing one query per row), scoped to guests whose
// status is currently `checked_in`.
export async function listCheckedInVisitors(caller: Caller) {
  const requests = await db.query.visitorRequests.findMany({
    where: { societyId: caller.societyId, status: 'checked_in' },
    with: {
      flat: true,
      deliveryDetails: true,
      cabDetails: true,
      serviceStaffDetails: true,
      // At most one open entry log per request — logEntry refuses to
      // re-check-in a request that's already `checked_in`.
      entryLogs: {
        where: { exitTime: { isNull: true } },
        orderBy: { entryTime: 'desc' },
        limit: 1
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  return requests.map(({ entryLogs, ...request }) => ({
    ...request,
    entryTime: entryLogs[0]?.entryTime?.toISOString() ?? null
  }));
}

// Generic authenticated upload — despite the name (kept for backwards
// compatibility with the shared POST /api/upload route across visitors and
// complaints), this just uploads whatever base64 file it's given to
// ImageKit and hands back the resulting URL. Payment confirmation
// screenshots (Chapter 15) reuse the same helper directly rather than
// going through this route, since they need society/flat scoping the
// generic route doesn't have.
export async function uploadVisitorPhoto(input: UploadVisitorPhotoInput) {
  const uploaded = await uploadToImageKit({
    base64: input.base64,
    fileName: input.fileName,
    folder: 'general'
  });

  return {
    url: uploaded.url,
    fileName: input.fileName,
    contentType: input.contentType
  };
}

// ─── Chapter 8 — Pre-Approvals ──────────────────────────────────────────────

// Excludes 0/O and 1/I/L — a guard reading this off a resident's phone
// screen at the gate shouldn't have to guess which character it is.
const PASS_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PASS_CODE_LENGTH = 6;
const PASS_CODE_MAX_ATTEMPTS = 5;

function generatePassCode(): string {
  let code = '';
  for (let i = 0; i < PASS_CODE_LENGTH; i++) {
    code += PASS_CODE_ALPHABET[randomInt(PASS_CODE_ALPHABET.length)];
  }
  return code;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}

export async function createPreApproval(caller: Caller, dto: CreatePreApprovalInput) {
  if (!caller.flatId) {
    throw AppError.forbidden('You are not assigned to a flat');
  }

  const validFrom = dto.validFrom ? new Date(dto.validFrom) : new Date();
  const validUntil = new Date(dto.validUntil);

  // Codes collide roughly never (32^6 keyspace scoped per society), but the
  // unique constraint is the real guarantee — this loop just makes the rare
  // collision invisible to the caller instead of surfacing a 409.
  for (let attempt = 1; attempt <= PASS_CODE_MAX_ATTEMPTS; attempt++) {
    try {
      const [created] = await db
        .insert(visitorRequests)
        .values({
          societyId: caller.societyId,
          flatId: caller.flatId,
          visitorType: dto.visitorType ?? 'guest',
          approverType: 'resident',
          name: dto.name,
          phone: dto.phone ?? null,
          purpose: dto.purpose ?? null,
          status: 'approved',
          source: 'pre_approval',
          createdBy: caller.id,
          approvedBy: caller.id,
          passCode: generatePassCode(),
          validFrom,
          validUntil
        })
        .returning();

      if (!created) {
        throw new AppError(500, 'DATABASE_ERROR', 'Failed to create pre-approval');
      }

      return created;
    } catch (err) {
      if (isUniqueViolation(err) && attempt < PASS_CODE_MAX_ATTEMPTS) {
        continue;
      }
      throw err;
    }
  }

  // Unreachable — the loop above always returns or throws — but keeps
  // TypeScript's control-flow analysis happy about a return on every path.
  throw new AppError(500, 'DATABASE_ERROR', 'Failed to generate a unique pass code');
}

export async function listPreApprovals(caller: Caller) {
  // Only what this resident personally created — matches plan.md's
  // "pre-approvals they created", not every pre-approval for their flat.
  return await db.query.visitorRequests.findMany({
    where: {
      societyId: caller.societyId,
      source: 'pre_approval',
      createdBy: caller.id
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function verifyPass(caller: Caller, dto: VerifyPassInput) {
  const request = dto.requestId
    ? await db.query.visitorRequests.findFirst({
        where: { id: dto.requestId, societyId: caller.societyId, source: 'pre_approval' },
        with: { flat: true, createdByUser: true }
      })
    : await db.query.visitorRequests.findFirst({
        where: {
          passCode: dto.passCode!.toUpperCase(),
          societyId: caller.societyId,
          source: 'pre_approval'
        },
        with: { flat: true, createdByUser: true }
      });

  if (!request) {
    throw AppError.notFound('No pre-approval found for this code');
  }

  if (request.status !== 'approved') {
    throw AppError.conflict('This pre-approval is no longer active');
  }

  const now = new Date();
  if (request.validFrom && now < request.validFrom) {
    throw AppError.badRequest('This pass is not valid yet');
  }
  if (request.validUntil && now > request.validUntil) {
    throw AppError.conflict('This pre-approval pass has expired');
  }

  const openEntry = await db.query.visitorEntryLogs.findFirst({
    where: {
      visitorRequestId: request.id,
      exitTime: { isNull: true }
    },
    columns: { id: true }
  });

  return { ...request, isInside: Boolean(openEntry) };
}
