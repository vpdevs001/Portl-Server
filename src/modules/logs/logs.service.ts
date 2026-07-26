import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../../common/db';
import { AppError } from '../../common/errors/app-error';
import { assertBelongsToSociety } from '../../common/helpers/tenant.helper';
import { residentEntryLogs, staffEntryLogs } from '../../common/db/schema';
import type { Caller, GateLogItem, ListLogsQuery, LogResidentInput, LogStaffInput } from './logs.types';

function startOfDay(dateStr: string) {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function endOfDay(dateStr: string) {
  return new Date(`${dateStr}T23:59:59.999Z`);
}

async function assertResidentInSociety(userId: string, societyId: string) {
  const resident = await db.query.user.findFirst({
    where: { id: userId, societyId, role: 'resident' },
    columns: { id: true, societyId: true, name: true }
  });

  if (!resident) {
    throw AppError.notFound('Resident not found in this society');
  }

  return resident;
}

async function assertStaffInSociety(staffId: string, societyId: string) {
  const staff = await db.query.staffDirectory.findFirst({
    where: { id: staffId, societyId },
    columns: { id: true, societyId: true, name: true }
  });

  assertBelongsToSociety(staff, societyId, 'Staff member');
  return staff!;
}

async function findOpenResidentLog(userId: string, societyId: string) {
  return db.query.residentEntryLogs.findFirst({
    where: {
      userId,
      societyId,
      exitTime: { isNull: true }
    },
    orderBy: (log, { desc }) => [desc(log.entryTime)]
  });
}

async function findOpenStaffLog(staffId: string, societyId: string) {
  return db.query.staffEntryLogs.findFirst({
    where: {
      staffId,
      societyId,
      exitTime: { isNull: true }
    },
    orderBy: (log, { desc }) => [desc(log.entryTime)]
  });
}

export async function logResident(societyId: string, guardId: string, dto: LogResidentInput) {
  await assertResidentInSociety(dto.userId, societyId);

  if (dto.action === 'entry') {
    const openLog = await findOpenResidentLog(dto.userId, societyId);
    if (openLog) {
      throw AppError.conflict('Resident is already checked in');
    }

    const [entry] = await db
      .insert(residentEntryLogs)
      .values({
        societyId,
        userId: dto.userId,
        entryTime: new Date(),
        entryMarkedBy: guardId
      })
      .returning();

    return entry;
  }

  const [entry] = await db
    .update(residentEntryLogs)
    .set({
      exitTime: new Date(),
      exitMarkedBy: guardId
    })
    .where(
      and(
        eq(residentEntryLogs.userId, dto.userId),
        eq(residentEntryLogs.societyId, societyId),
        isNull(residentEntryLogs.exitTime)
      )
    )
    .returning();

  if (!entry) {
    throw AppError.notFound('No open entry log found for this resident');
  }

  return entry;
}

export async function logStaff(societyId: string, guardId: string, dto: LogStaffInput) {
  await assertStaffInSociety(dto.staffId, societyId);

  if (dto.action === 'entry') {
    const openLog = await findOpenStaffLog(dto.staffId, societyId);
    if (openLog) {
      throw AppError.conflict('Staff member is already checked in');
    }

    const [entry] = await db
      .insert(staffEntryLogs)
      .values({
        societyId,
        staffId: dto.staffId,
        entryTime: new Date(),
        entryMarkedBy: guardId
      })
      .returning();

    return entry;
  }

  const [entry] = await db
    .update(staffEntryLogs)
    .set({
      exitTime: new Date(),
      exitMarkedBy: guardId
    })
    .where(
      and(
        eq(staffEntryLogs.staffId, dto.staffId),
        eq(staffEntryLogs.societyId, societyId),
        isNull(staffEntryLogs.exitTime)
      )
    )
    .returning();

  if (!entry) {
    throw AppError.notFound('No open entry log found for this staff member');
  }

  return entry;
}

function mapResidentLog(log: {
  id: string;
  entryTime: Date | null;
  exitTime: Date | null;
  user: { name: string; flat?: { flatNumber: string; tower?: { name: string } | null } | null } | null;
}): GateLogItem {
  const flatLabel = log.user?.flat
    ? `${log.user.flat.tower?.name ?? ''} · ${log.user.flat.flatNumber}`.replace(/^ · /, '').trim()
    : null;

  return {
    id: log.id,
    type: 'resident',
    name: log.user?.name ?? 'Unknown resident',
    subtitle: flatLabel,
    entryTime: log.entryTime?.toISOString() ?? null,
    exitTime: log.exitTime?.toISOString() ?? null,
    isInside: Boolean(log.entryTime && !log.exitTime)
  };
}

function mapStaffLog(log: {
  id: string;
  entryTime: Date | null;
  exitTime: Date | null;
  staff: { name: string; roleTitle: string } | null;
}): GateLogItem {
  return {
    id: log.id,
    type: 'staff',
    name: log.staff?.name ?? 'Unknown staff',
    subtitle: log.staff?.roleTitle ?? null,
    entryTime: log.entryTime?.toISOString() ?? null,
    exitTime: log.exitTime?.toISOString() ?? null,
    isInside: Boolean(log.entryTime && !log.exitTime)
  };
}

function formatVisitorType(visitorType: string) {
  return visitorType.replace('_', ' ');
}

function mapGuestLog(log: {
  id: string;
  entryTime: Date | null;
  exitTime: Date | null;
  visitorRequest:
    | {
        name: string;
        visitorType: string;
        source: string;
        flat?: { flatNumber: string; tower?: { name: string } | null } | null;
      }
    | null;
}): GateLogItem {
  const flatLabel = log.visitorRequest?.flat
    ? `${log.visitorRequest.flat.tower?.name ?? ''} · ${log.visitorRequest.flat.flatNumber}`
        .replace(/^ · /, '')
        .trim()
    : null;
  const visitorLabel = log.visitorRequest
    ? `${log.visitorRequest.source === 'pre_approval' ? 'Pre-approved ' : ''}${formatVisitorType(
        log.visitorRequest.visitorType
      )}`
    : 'Guest';

  return {
    id: log.id,
    type: 'guest',
    name: log.visitorRequest?.name ?? 'Unknown guest',
    subtitle: flatLabel ? `${visitorLabel} · ${flatLabel}` : visitorLabel,
    entryTime: log.entryTime?.toISOString() ?? null,
    exitTime: log.exitTime?.toISOString() ?? null,
    isInside: Boolean(log.entryTime && !log.exitTime)
  };
}

function matchesSearch(item: GateLogItem, search?: string) {
  if (!search?.trim()) return true;
  const term = search.trim().toLowerCase();
  return (
    item.name.toLowerCase().includes(term) ||
    (item.subtitle?.toLowerCase().includes(term) ?? false)
  );
}

export async function listGateLogs(caller: Caller, query: ListLogsQuery): Promise<GateLogItem[]> {
  const { date, search, type } = query;

  const dateFilter = date
    ? {
        entryTime: {
          gte: startOfDay(date),
          lte: endOfDay(date)
        }
      }
    : {};

  if (caller.role === 'resident') {
    const residentLogs = await db.query.residentEntryLogs.findMany({
      where: {
        societyId: caller.societyId,
        userId: caller.id,
        ...dateFilter
      },
      with: {
        user: {
          with: {
            flat: {
              with: { tower: true }
            }
          }
        }
      },
      orderBy: (log, { desc }) => [desc(log.entryTime)]
    });

    const results = residentLogs.map(mapResidentLog);

    if ((type === 'guest' || type === 'all') && caller.flatId) {
      const guestLogs = await db.query.visitorEntryLogs.findMany({
        where: dateFilter,
        with: {
          visitorRequest: {
            with: {
              flat: {
                with: { tower: true }
              }
            }
          }
        },
        orderBy: (log, { desc }) => [desc(log.entryTime)]
      });

      results.push(
        ...guestLogs
          .filter(
            (log) =>
              log.visitorRequest?.societyId === caller.societyId &&
              log.visitorRequest.flatId === caller.flatId
          )
          .map(mapGuestLog)
      );
    }

    return results
      .filter((item) => (type === 'all' ? true : item.type === type))
      .filter((item) => matchesSearch(item, search))
      .sort((a, b) => {
        const aTime = a.entryTime ? new Date(a.entryTime).getTime() : 0;
        const bTime = b.entryTime ? new Date(b.entryTime).getTime() : 0;
        return bTime - aTime;
      });
  }

  const results: GateLogItem[] = [];

  if (type === 'resident' || type === 'all') {
    const residentLogs = await db.query.residentEntryLogs.findMany({
      where: {
        societyId: caller.societyId,
        ...dateFilter
      },
      with: {
        user: {
          with: {
            flat: {
              with: { tower: true }
            }
          }
        }
      },
      orderBy: (log, { desc }) => [desc(log.entryTime)]
    });

    results.push(...residentLogs.map(mapResidentLog));
  }

  if (type === 'staff' || type === 'all') {
    const staffLogs = await db.query.staffEntryLogs.findMany({
      where: {
        societyId: caller.societyId,
        ...dateFilter
      },
      with: {
        staff: true
      },
      orderBy: (log, { desc }) => [desc(log.entryTime)]
    });

    results.push(...staffLogs.map(mapStaffLog));
  }

  if (type === 'guest' || type === 'all') {
    const guestLogs = await db.query.visitorEntryLogs.findMany({
      where: dateFilter,
      with: {
        visitorRequest: {
          with: {
            flat: {
              with: { tower: true }
            }
          }
        }
      },
      orderBy: (log, { desc }) => [desc(log.entryTime)]
    });

    results.push(
      ...guestLogs
        .filter((log) => log.visitorRequest?.societyId === caller.societyId)
        .map(mapGuestLog)
    );
  }

  return results
    .filter((item) => matchesSearch(item, search))
    .sort((a, b) => {
      const aTime = a.entryTime ? new Date(a.entryTime).getTime() : 0;
      const bTime = b.entryTime ? new Date(b.entryTime).getTime() : 0;
      return bTime - aTime;
    });
}

export async function listStaffForGate(societyId: string, search?: string) {
  const staff = await db.query.staffDirectory.findMany({
    where: { societyId },
    orderBy: (member, { asc }) => [asc(member.name)]
  });

  if (!search?.trim()) return staff;

  const term = search.trim().toLowerCase();
  return staff.filter(
    (member) =>
      member.name.toLowerCase().includes(term) ||
      member.roleTitle.toLowerCase().includes(term)
  );
}

export async function listResidentsForGate(
  societyId: string,
  filters?: { search?: string; towerId?: string; flatId?: string }
) {
  const members = await db.query.user.findMany({
    where: {
      societyId,
      role: 'resident',
      ...(filters?.flatId ? { flatId: filters.flatId } : {})
    },
    with: {
      flat: {
        with: { tower: true }
      }
    },
    orderBy: (u, { asc }) => [asc(u.name)]
  });

  let filtered = members;

  if (filters?.towerId) {
    filtered = filtered.filter((member) => member.flat?.towerId === filters.towerId);
  }

  if (filters?.search?.trim()) {
    const term = filters.search.trim().toLowerCase();
    filtered = filtered.filter((member) => {
      const flatLabel = member.flat
        ? `${member.flat.tower?.name ?? ''} ${member.flat.flatNumber}`.toLowerCase()
        : '';
      return member.name.toLowerCase().includes(term) || flatLabel.includes(term);
    });
  }

  return filtered;
}

export async function getResidentCheckInStatus(societyId: string, userIds: string[]) {
  if (userIds.length === 0) return {};

  const openLogs = await db.query.residentEntryLogs.findMany({
    where: {
      societyId,
      userId: { in: userIds },
      exitTime: { isNull: true }
    },
    columns: { userId: true }
  });

  return Object.fromEntries(openLogs.map((log) => [log.userId, true]));
}

export async function getStaffCheckInStatus(societyId: string, staffIds: string[]) {
  if (staffIds.length === 0) return {};

  const openLogs = await db.query.staffEntryLogs.findMany({
    where: {
      societyId,
      staffId: { in: staffIds },
      exitTime: { isNull: true }
    },
    columns: { staffId: true }
  });

  return Object.fromEntries(openLogs.map((log) => [log.staffId, true]));
}
