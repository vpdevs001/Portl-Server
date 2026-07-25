import type { FastifyInstance } from 'fastify';
import {
  createEmergencyAlert,
  createNotice,
  deleteNotice,
  listNotices,
  updateNotice
} from './notices.controllers';
import { requireAuth, requireRole, requireSociety } from '../../common/middleware/auth.middleware';

export async function noticesRoutes(app: FastifyInstance) {
  app.post(
    '/api/notices',
    { preHandler: [requireAuth, requireSociety, requireRole('society_admin')] },
    createNotice
  );

  // Chapter 17 — guard-triggered broadcast to the whole society. Kept as
  // its own endpoint (rather than widening requireRole on POST /api/notices)
  // so a guard can only ever create the narrow 'emergency' shape, never an
  // arbitrary-category notice. Tightly rate-limited — a real emergency is
  // a handful of taps, not a burst; anything beyond that is almost
  // certainly a stuck client retrying, not a second emergency.
  app.post(
    '/api/notices/emergency-alert',
    {
      preHandler: [requireAuth, requireSociety, requireRole('security_guard')],
      config: { rateLimit: { max: 5, timeWindow: '5 minutes' } }
    },
    createEmergencyAlert
  );

  // Residents/guards/admins all read the feed — filtering by expiry and
  // includeExpired happens inside the service, based on caller.role.
  app.get('/api/notices', { preHandler: [requireAuth, requireSociety] }, listNotices);

  app.put(
    '/api/notices/:id',
    { preHandler: [requireAuth, requireSociety, requireRole('society_admin')] },
    updateNotice
  );

  app.delete(
    '/api/notices/:id',
    { preHandler: [requireAuth, requireSociety, requireRole('society_admin')] },
    deleteNotice
  );
}
