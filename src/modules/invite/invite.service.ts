import { and, eq, ilike, isNull, not, or } from 'drizzle-orm';
import { db } from '../../common/db';
import { societyInvites } from '../../common/db/schema/invites.schema';
import { user } from '../../common/db/schema/auth.schema';
import { AppError } from '../../common/errors/app-error';
import type { CreateInviteInput } from './invite.schema';

export async function searchUnassignedUsers(query: string, excludingUserId: string) {
  return await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image
    })
    .from(user)
    .where(
      and(
        isNull(user.societyId),
        not(eq(user.id, excludingUserId)),
        or(ilike(user.name, `%${query}%`), ilike(user.email, `%${query}%`))
      )
    )
    .limit(20);
}

export async function createInvite(
  societyId: string,
  invitedByUserId: string,
  dto: CreateInviteInput
) {
  // Re-verify the target user's societyId is still null
  const targetUser = await db.query.user.findFirst({
    where: { id: dto.userId }
  });

  if (!targetUser) {
    throw AppError.notFound('Target user not found');
  }

  if (targetUser.societyId) {
    throw AppError.conflict('User is already assigned to a society');
  }

  // Validate flat if resident
  if (dto.role === 'resident' && dto.flatId) {
    const flat = await db.query.flats.findFirst({
      where: { id: dto.flatId!, societyId }
    });
    if (!flat) {
      throw AppError.notFound('Flat not found in this society');
    }
  }

  // Check if a pending invite from this society to this user already exists
  const existingInvite = await db.query.societyInvites.findFirst({
    where: { societyId, invitedUserId: dto.userId, status: 'pending' }
  });

  if (existingInvite) {
    throw AppError.conflict('An invitation is already pending for this user');
  }

  const [newInvite] = await db
    .insert(societyInvites)
    .values({
      societyId,
      invitedUserId: dto.userId,
      invitedBy: invitedByUserId,
      role: dto.role,
      flatId: dto.role === 'resident' ? (dto.flatId ?? null) : null,
      status: 'pending'
    })
    .returning();

  if (!newInvite) {
    throw new AppError(500, 'DATABASE_ERROR', 'Failed to create invitation');
  }

  return newInvite;
}

export async function listSentInvites(
  societyId: string,
  status?: 'pending' | 'accepted' | 'rejected' | 'cancelled'
) {
  return await db.query.societyInvites.findMany({
    where: status ? { societyId, status } : { societyId },
    with: {
      invitedUser: true,
      flat: true
    },
    orderBy: (i, { desc }) => [desc(i.createdAt)]
  });
}

export async function cancelInvite(societyId: string, inviteId: string) {
  const invite = await db.query.societyInvites.findFirst({
    where: { id: inviteId, societyId }
  });

  if (!invite) {
    throw AppError.notFound('Invitation not found');
  }

  if (invite.status !== 'pending') {
    throw AppError.badRequest('Only pending invitations can be cancelled');
  }

  const [updatedInvite] = await db
    .update(societyInvites)
    .set({ status: 'cancelled' })
    .where(eq(societyInvites.id, inviteId))
    .returning();

  return updatedInvite;
}

export async function listMyInvites(userId: string) {
  return await db.query.societyInvites.findMany({
    where: { invitedUserId: userId, status: 'pending' },
    with: {
      society: true,
      flat: true
    },
    orderBy: (i, { desc }) => [desc(i.createdAt)]
  });
}

export async function respondToInvite(
  userId: string,
  inviteId: string,
  action: 'accept' | 'reject'
) {
  return await db.transaction(async (tx) => {
    const invite = await tx.query.societyInvites.findFirst({
      where: { id: inviteId, invitedUserId: userId }
    });

    if (!invite || invite.status !== 'pending') {
      throw AppError.notFound('Invitation not found or no longer pending');
    }

    if (action === 'reject') {
      const [updatedInvite] = await tx
        .update(societyInvites)
        .set({ status: 'rejected' })
        .where(eq(societyInvites.id, inviteId))
        .returning();
      return updatedInvite;
    }

    // Accept flow
    // 1. Re-verify user is not already in a society
    const targetUser = await tx.query.user.findFirst({
      where: { id: userId }
    });

    if (!targetUser) {
      throw AppError.notFound('User not found');
    }

    if (targetUser.societyId) {
      throw AppError.conflict('User is already assigned to a society');
    }

    // 2. Update invite status to accepted
    const [updatedInvite] = await tx
      .update(societyInvites)
      .set({ status: 'accepted' })
      .where(eq(societyInvites.id, inviteId))
      .returning();

    // 3. Update user properties
    await tx
      .update(user)
      .set({
        societyId: invite.societyId,
        role: invite.role,
        flatId: invite.flatId
      })
      .where(eq(user.id, userId));

    // 4. Cancel all other pending invites for this user
    await tx
      .update(societyInvites)
      .set({ status: 'cancelled' })
      .where(and(eq(societyInvites.invitedUserId, userId), eq(societyInvites.status, 'pending')));

    return updatedInvite;
  });
}
