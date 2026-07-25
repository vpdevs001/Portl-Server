import type { FastifyInstance } from 'fastify';
import {
  createPreApproval,
  createVisitorRequest,
  listCheckedInVisitors,
  listPendingVisitors,
  listPreApprovals,
  logVisitorEntry,
  logVisitorExit,
  respondToVisitorRequest,
  uploadVisitorPhoto,
  verifyPass
} from './visitors.controllers';
import { requireAuth, requireRole, requireSociety } from '../../common/middleware/auth.middleware';

export async function visitorsRoutes(app: FastifyInstance) {
  app.post(
    '/api/visitors/request',
    { preHandler: [requireAuth, requireSociety, requireRole('security_guard')] },
    createVisitorRequest
  );

  app.get(
    '/api/visitors/pending',
    { preHandler: [requireAuth, requireSociety] },
    listPendingVisitors
  );

  app.put(
    '/api/visitors/request/:id/respond',
    {
      preHandler: [requireAuth, requireSociety, requireRole('resident', 'society_admin')],
      // Chapter 17 — backstop against a buggy approve/reject retry-loop
      // rather than a real attack surface (already auth'd + tenant-scoped).
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } }
    },
    respondToVisitorRequest
  );

  app.post(
    '/api/visitors/request/:id/log-entry',
    { preHandler: [requireAuth, requireSociety, requireRole('security_guard')] },
    logVisitorEntry
  );

  app.post(
    '/api/visitors/request/:id/log-exit',
    { preHandler: [requireAuth, requireSociety, requireRole('security_guard')] },
    logVisitorExit
  );

  // Generic authenticated upload endpoint — originally guard-only for
  // visitor photos (Chapter 7), opened up to residents in Chapter 12 for
  // complaint photos. Same base64-upload flow either way.
  app.post(
    '/api/upload',
    { preHandler: [requireAuth, requireSociety, requireRole('security_guard', 'resident')] },
    uploadVisitorPhoto
  );

  // POST /api/notifications/register moved to the notifications module
  // (Chapter 16) — see notifications.routes.ts.

  // ─── Chapter 8 — Pre-Approvals ────────────────────────────────────────────

  app.post(
    '/api/visitors/pre-approve',
    { preHandler: [requireAuth, requireSociety, requireRole('resident')] },
    createPreApproval
  );

  app.get(
    '/api/visitors/pre-approvals',
    { preHandler: [requireAuth, requireSociety, requireRole('resident')] },
    listPreApprovals
  );

  app.post(
    '/api/visitors/verify-pass',
    {
      preHandler: [requireAuth, requireSociety, requireRole('security_guard')],
      // Chapter 17 — the one genuinely brute-forceable endpoint in the API:
      // a 6-char alphanumeric passCode is guessable via repeated calls.
      // Keyed by societyId + IP (not IP alone) so one guard device hammering
      // it doesn't rate-limit a neighboring society off the same endpoint.
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
          keyGenerator: (request) => `${request.user?.societyId ?? 'anon'}:${request.ip}`
        }
      }
    },
    verifyPass
  );

  app.get(
    '/api/visitors/checked-in',
    { preHandler: [requireAuth, requireSociety, requireRole('security_guard')] },
    listCheckedInVisitors
  );
}
