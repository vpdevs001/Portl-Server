import { and, eq, gt, gte, lt, lte, or } from 'drizzle-orm';
import { db } from '../../common/db/index.ts';
import { AppError } from '../../common/errors/app-error.ts';
import { amenities, amenityBookings } from '../../common/db/schema/index.ts';
import type {
  BookAmenityInput,
  Caller,
  CreateAmenityInput,
  ListBookingsQuery
} from './amenities.types.ts';

export async function createAmenity(caller: Caller, dto: CreateAmenityInput) {
  const [created] = await db
    .insert(amenities)
    .values({
      societyId: caller.societyId,
      name: dto.name,
      description: dto.description ?? null,
      capacity: dto.capacity ?? null
    })
    .returning();

  return created;
}

export async function listAmenities(caller: Caller) {
  return await db.query.amenities.findMany({
    where: { societyId: caller.societyId, isActive: true },
    orderBy: { name: 'asc' }
  });
}

async function findActiveAmenityInSociety(amenityId: string, societyId: string) {
  const amenity = await db.query.amenities.findFirst({
    where: { id: amenityId, societyId, isActive: true }
  });

  if (!amenity) {
    throw AppError.notFound('Amenity not found');
  }

  return amenity;
}

export async function bookAmenity(caller: Caller, amenityId: string, dto: BookAmenityInput) {
  if (!caller.flatId) {
    throw AppError.forbidden('You are not assigned to a flat');
  }

  await findActiveAmenityInSociety(amenityId, caller.societyId);

  const startTime = new Date(dto.startTime);
  const endTime = new Date(dto.endTime);

  // Everything below runs inside one transaction so the overlap check and
  // the insert are atomic — otherwise two residents booking the same slot
  // at the same instant could both pass the check before either commits.
  return await db.transaction(async (tx) => {
    const overlapping = await tx
      .select()
      .from(amenityBookings)
      .where(
        and(
          eq(amenityBookings.amenityId, amenityId),
          eq(amenityBookings.status, 'confirmed'),
          or(
            // New slot starts inside an existing booking
            and(lte(amenityBookings.startTime, startTime), gt(amenityBookings.endTime, startTime)),
            // New slot ends inside an existing booking
            and(lt(amenityBookings.startTime, endTime), gte(amenityBookings.endTime, endTime)),
            // New slot fully contains an existing booking
            and(gte(amenityBookings.startTime, startTime), lte(amenityBookings.endTime, endTime))
          )
        )
      );

    if (overlapping.length > 0) {
      throw AppError.conflict('This time slot overlaps with an existing booking.', {
        code: 'SLOT_DOUBLE_BOOKED'
      });
    }

    const [created] = await tx
      .insert(amenityBookings)
      .values({
        amenityId,
        flatId: caller.flatId!,
        bookedBy: caller.id,
        startTime,
        endTime,
        status: 'confirmed'
      })
      .returning();

    return created;
  });
}

// Residents see their own flat's bookings (so the slot-grid can show which
// slots they've personally reserved); admins see the whole society's
// calendar for the booking-logs view. Either can narrow to a single
// amenity via ?amenityId, which the resident booking screen uses to render
// that amenity's taken slots.
export async function listBookings(caller: Caller, query: ListBookingsQuery) {
  if (caller.role === 'society_admin') {
    return await db.query.amenityBookings.findMany({
      where: {
        amenity: { societyId: caller.societyId },
        ...(query.amenityId ? { amenityId: query.amenityId } : {})
      },
      with: {
        amenity: true,
        flat: true,
        bookedByUser: { columns: { id: true, name: true } }
      },
      orderBy: { startTime: 'desc' }
    });
  }

  if (query.amenityId) {
    return await db.query.amenityBookings.findMany({
      where: {
        amenityId: query.amenityId,
        status: 'confirmed',
        amenity: { societyId: caller.societyId }
      },
      with: {
        amenity: true,
        flat: true,
        bookedByUser: { columns: { id: true, name: true } }
      },
      orderBy: { startTime: 'asc' }
    });
  }

  if (!caller.flatId) {
    return [];
  }

  return await db.query.amenityBookings.findMany({
    where: { flatId: caller.flatId, amenity: { societyId: caller.societyId } },
    with: {
      amenity: true,
      flat: true,
      bookedByUser: { columns: { id: true, name: true } }
    },
    orderBy: { startTime: 'desc' }
  });
}
