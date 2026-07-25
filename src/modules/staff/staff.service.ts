import { and, eq } from 'drizzle-orm';
import { db } from '../../common/db/index.ts';
import { AppError } from '../../common/errors/app-error.ts';
import { staffDirectory } from '../../common/db/schema/index.ts';
import type { Caller, CreateStaffInput, ListStaffQuery, UpdateStaffInput } from './staff.types.ts';

export async function createStaff(caller: Caller, dto: CreateStaffInput) {
  const [created] = await db
    .insert(staffDirectory)
    .values({
      societyId: caller.societyId,
      name: dto.name,
      roleTitle: dto.roleTitle,
      phone: dto.phone,
      photo: dto.photo ?? null
    })
    .returning();

  return created;
}

export async function updateStaff(caller: Caller, staffId: string, dto: UpdateStaffInput) {
  const staff = await db.query.staffDirectory.findFirst({
    where: { id: staffId, societyId: caller.societyId }
  });

  if (!staff) {
    throw AppError.notFound('Staff member not found');
  }

  const [updated] = await db
    .update(staffDirectory)
    .set({
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.roleTitle !== undefined ? { roleTitle: dto.roleTitle } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.photo !== undefined ? { photo: dto.photo ?? null } : {})
    })
    .where(and(eq(staffDirectory.id, staffId), eq(staffDirectory.societyId, caller.societyId)))
    .returning();

  return updated;
}

export async function listStaff(caller: Caller, query: ListStaffQuery) {
  const list = await db.query.staffDirectory.findMany({
    where: { societyId: caller.societyId },
    orderBy: { name: 'asc' }
  });

  let filtered = list;

  if (query.roleTitle) {
    const roleLower = query.roleTitle.toLowerCase();
    filtered = filtered.filter((s) => s.roleTitle.toLowerCase().includes(roleLower));
  }

  if (query.search) {
    const searchLower = query.search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(searchLower) ||
        s.phone.toLowerCase().includes(searchLower) ||
        s.roleTitle.toLowerCase().includes(searchLower)
    );
  }

  return filtered;
}

export async function removeStaff(caller: Caller, staffId: string) {
  const staff = await db.query.staffDirectory.findFirst({
    where: { id: staffId, societyId: caller.societyId }
  });

  if (!staff) {
    throw AppError.notFound('Staff member not found');
  }

  await db.delete(staffDirectory).where(eq(staffDirectory.id, staffId));
  return { success: true };
}
