import type { FastifyInstance } from 'fastify';
import { confirmPayment, listDues, setDueStatus, verifyPayment } from './payments.controllers';
import { requireAuth, requireRole, requireSociety } from '../../common/middleware/auth.middleware';

export async function paymentsRoutes(app: FastifyInstance) {
  // Residents see only their own flat's current-month due; admins see the
  // whole society's — the split happens inside the service based on
  // caller.role. Dues are auto-materialized here too, so there's no
  // separate "generate bills" step: the first read of a new month creates
  // everyone's due for that month as 'pending'.
  app.get('/api/payments/dues', { preHandler: [requireAuth, requireSociety] }, listDues);

  // Admin override — mark a due paid/pending directly, bypassing the
  // resident-submits-proof flow entirely (e.g. cash payments).
  app.patch(
    '/api/payments/dues/:id/status',
    { preHandler: [requireAuth, requireSociety, requireRole('society_admin')] },
    setDueStatus
  );

  app.post(
    '/api/payments/confirm',
    { preHandler: [requireAuth, requireSociety, requireRole('resident')] },
    confirmPayment
  );

  app.put(
    '/api/payments/confirm/:id/verify',
    { preHandler: [requireAuth, requireSociety, requireRole('society_admin')] },
    verifyPayment
  );
}
