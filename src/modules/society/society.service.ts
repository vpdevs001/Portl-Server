import { and, eq, ne, sql } from 'drizzle-orm';
import { db } from '../../common/db';
import { societies, towers, flats } from '../../common/db/schema/identity.schema';
import { user } from '../../common/db/schema/auth.schema';
import { AppError } from '../../common/errors/app-error';
import type {
  CreateSocietyInput,
  CreateTowerInput,
  CreateFlatInput,
  UpdateFlatInput,
  UpdateSocietyDetailsInput
} from './society.schema';

export async function createSocietyAndAssignAdmin(userId: string, dto: CreateSocietyInput) {
  return await db.transaction(async (tx) => {
    // Check if user already belongs to a society
    const currentUser = await tx.query.user.findFirst({
      where: { id: userId }
    });

    if (!currentUser) {
      throw AppError.unauthorized('User not found');
    }

    if (currentUser.societyId) {
      throw AppError.conflict('User is already assigned to a society');
    }

    // Create society
    const [newSociety] = await tx
      .insert(societies)
      .values({
        name: dto.name,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode
      })
      .returning();

    if (!newSociety) {
      throw new AppError(500, 'DATABASE_ERROR', 'Failed to create society');
    }

    // Assign user as society admin
    await tx
      .update(user)
      .set({
        societyId: newSociety.id,
        role: 'society_admin'
      })
      .where(eq(user.id, userId));

    return newSociety;
  });
}

export async function createTower(societyId: string, dto: CreateTowerInput) {
  const [newTower] = await db
    .insert(towers)
    .values({
      societyId,
      name: dto.name
    })
    .returning();

  if (!newTower) {
    throw new AppError(500, 'DATABASE_ERROR', 'Failed to create tower');
  }

  return newTower;
}

export async function createFlat(societyId: string, dto: CreateFlatInput) {
  // Validate that the tower belongs to this society
  const tower = await db.query.towers.findFirst({
    where: { id: dto.towerId, societyId }
  });

  if (!tower) {
    throw AppError.notFound('Tower not found in this society');
  }

  const [newFlat] = await db
    .insert(flats)
    .values({
      societyId,
      towerId: dto.towerId,
      flatNumber: dto.flatNumber,
      floor: dto.floor ?? null,
      flatType: dto.flatType,
      monthlyAmount: dto.monthlyAmount.toFixed(2)
    })
    .returning();

  if (!newFlat) {
    throw new AppError(500, 'DATABASE_ERROR', 'Failed to create flat');
  }

  return newFlat;
}

export async function getSocietyDetails(societyId: string) {
  const society = await db.query.societies.findFirst({
    where: { id: societyId },
    with: {
      towers: true
    }
  });

  if (!society) {
    throw AppError.notFound('Society not found');
  }

  // Count flats and users
  const [flatCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(flats)
    .where(eq(flats.societyId, societyId));

  const [memberCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(user)
    .where(eq(user.societyId, societyId));

  return {
    ...society,
    flatCount: flatCountResult?.count ?? 0,
    memberCount: memberCountResult?.count ?? 0
  };
}

export async function listTowers(societyId: string) {
  return await db.query.towers.findMany({
    where: { societyId },
    orderBy: (t, { asc }) => [asc(t.name)]
  });
}

export async function listFlats(societyId: string, towerId?: string) {
  return await db.query.flats.findMany({
    where: towerId ? { societyId, towerId } : { societyId },
    orderBy: (f, { asc }) => [asc(f.flatNumber)]
  });
}

export async function updateFlat(societyId: string, flatId: string, dto: UpdateFlatInput) {
  const flat = await db.query.flats.findFirst({ where: { id: flatId, societyId } });
  if (!flat) {
    throw AppError.notFound('Flat not found in this society');
  }

  const [updated] = await db
    .update(flats)
    .set({
      ...(dto.flatType ? { flatType: dto.flatType } : {}),
      ...(dto.monthlyAmount !== undefined ? { monthlyAmount: dto.monthlyAmount.toFixed(2) } : {})
    })
    .where(eq(flats.id, flatId))
    .returning();

  if (!updated) {
    throw new AppError(500, 'DATABASE_ERROR', 'Failed to update flat');
  }

  return updated;
}

export async function listMembers(
  societyId: string,
  role?: 'resident' | 'security_guard' | 'society_admin'
) {
  return await db.query.user.findMany({
    where: role ? { societyId, role } : { societyId },
    orderBy: (u, { asc }) => [asc(u.name)]
  });
}

export async function leaveSociety(userId: string) {
  return await db.transaction(async (tx) => {
    const currentUser = await tx.query.user.findFirst({ where: { id: userId } });

    if (!currentUser || !currentUser.societyId) {
      throw AppError.forbidden('User does not belong to a society');
    }

    // A sole admin leaving would strand the society with no one able to
    // manage it — require them to hand off admin duties to another member
    // first (Chapter 17+ concern; for now this just blocks the action).
    if (currentUser.role === 'society_admin') {
      const [otherAdmin] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(user)
        .where(
          and(
            eq(user.societyId, currentUser.societyId),
            eq(user.role, 'society_admin'),
            ne(user.id, userId)
          )
        );

      if (!otherAdmin || otherAdmin.count === 0) {
        throw AppError.conflict(
          'You are the only admin in this society. Promote another member to admin before leaving.'
        );
      }
    }

    const [updated] = await tx
      .update(user)
      .set({ societyId: null, flatId: null, role: null })
      .where(eq(user.id, userId))
      .returning();

    if (!updated) {
      throw new AppError(500, 'DATABASE_ERROR', 'Failed to leave society');
    }

    return updated;
  });
}

export async function removeMember(societyId: string, actorId: string, targetUserId: string) {
  if (targetUserId === actorId) {
    throw AppError.badRequest('Use the leave endpoint to remove yourself from a society');
  }

  return await db.transaction(async (tx) => {
    const targetUser = await tx.query.user.findFirst({
      where: { id: targetUserId, societyId }
    });

    if (!targetUser) {
      throw AppError.notFound('Member not found in this society');
    }

    const [updated] = await tx
      .update(user)
      .set({ societyId: null, flatId: null, role: null })
      .where(eq(user.id, targetUserId))
      .returning();

    if (!updated) {
      throw new AppError(500, 'DATABASE_ERROR', 'Failed to remove member');
    }

    return updated;
  });
}

export async function updateSocietyUpiId(societyId: string, upiId: string) {
  const [updated] = await db
    .update(societies)
    .set({ upiId })
    .where(eq(societies.id, societyId))
    .returning();

  if (!updated) {
    throw AppError.notFound('Society not found');
  }

  return updated;
}

export async function updateSocietyDetails(societyId: string, dto: UpdateSocietyDetailsInput) {
  if (Object.keys(dto).length === 0) {
    throw AppError.badRequest('Provide at least one field to update');
  }

  const [updated] = await db
    .update(societies)
    .set(dto)
    .where(eq(societies.id, societyId))
    .returning();

  if (!updated) {
    throw AppError.notFound('Society not found');
  }

  return updated;
}
