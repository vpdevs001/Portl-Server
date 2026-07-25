import { AppError } from '../errors/app-error';

// Covers the one-hop tenant-scoping pattern from the Chapter 5 design doc:
// a resource either carries societyId directly, or reaches it through one
// relation hop (e.g. `{ flat: { societyId } }`). Extend this union as later
// chapters introduce new one-hop tables (amenity bookings, payment
// confirmations, entry logs) — don't guess field shapes ahead of the schema
// that actually backs them.
type SocietyScopedResource =
  { societyId: string } | { flat: { societyId: string } } | { society: { societyId: string } };

export function assertBelongsToSociety<T extends SocietyScopedResource>(
  resource: T | null | undefined,
  callerSocietyId: string,
  resourceName = 'Resource'
): asserts resource is T {
  if (!resource) {
    throw AppError.notFound(`${resourceName} not found`);
  }

  const resourceSocietyId =
    'societyId' in resource
      ? resource.societyId
      : 'flat' in resource
        ? resource.flat.societyId
        : resource.society.societyId;

  if (resourceSocietyId !== callerSocietyId) {
    throw AppError.forbidden('Access denied');
  }
}
