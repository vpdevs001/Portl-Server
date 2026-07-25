import type { FastifyInstance } from 'fastify';
import { bookAmenity, createAmenity, listAmenities, listBookings } from './amenities.controllers';
import { requireAuth, requireRole, requireSociety } from '../../common/middleware/auth.middleware';

export async function amenitiesRoutes(app: FastifyInstance) {
  app.post(
    '/api/amenities',
    { preHandler: [requireAuth, requireSociety, requireRole('society_admin')] },
    createAmenity
  );

  app.get('/api/amenities', { preHandler: [requireAuth, requireSociety] }, listAmenities);

  app.post(
    '/api/amenities/:id/book',
    { preHandler: [requireAuth, requireSociety, requireRole('resident')] },
    bookAmenity
  );

  app.get('/api/amenities/bookings', { preHandler: [requireAuth, requireSociety] }, listBookings);
}
