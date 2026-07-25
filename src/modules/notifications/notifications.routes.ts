import type { FastifyInstance } from 'fastify';
import { registerPushToken, unregisterPushToken } from './notifications.controllers';
import { requireAuth, requireSociety } from '../../common/middleware/auth.middleware';

export async function notificationsRoutes(app: FastifyInstance) {
  // Moved here from visitors.routes.ts (Chapter 16) — behavior unchanged,
  // still dedupes on `(user_id, expo_push_token)` inside the service.
  app.post(
    '/api/notifications/register',
    { preHandler: [requireAuth, requireSociety] },
    registerPushToken
  );

  // New in Chapter 16 — called on logout so a stale device doesn't keep
  // receiving pushes for a session that's no longer active on it.
  app.delete(
    '/api/notifications/unregister/:token',
    { preHandler: [requireAuth, requireSociety] },
    unregisterPushToken
  );
}
