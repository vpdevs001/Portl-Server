import type { FastifyInstance } from 'fastify';
import {
  listLogs,
  listResidentsForGate,
  listStaffForGate,
  logResidentEntry,
  logStaffEntry
} from './logs.controllers';
import { requireAuth, requireRole, requireSociety } from '../../common/middleware/auth.middleware';

export async function logsRoutes(app: FastifyInstance) {
  app.post(
    '/api/logs/resident',
    { preHandler: [requireAuth, requireSociety, requireRole('security_guard')] },
    logResidentEntry
  );

  app.post(
    '/api/logs/staff',
    { preHandler: [requireAuth, requireSociety, requireRole('security_guard')] },
    logStaffEntry
  );

  app.get('/api/logs', { preHandler: [requireAuth, requireSociety] }, listLogs);

  // Helper endpoints for guard check-in screens (staff directory CRUD lands in Chapter 14).
  app.get(
    '/api/logs/residents',
    { preHandler: [requireAuth, requireSociety, requireRole('security_guard')] },
    listResidentsForGate
  );

  app.get(
    '/api/logs/staff',
    { preHandler: [requireAuth, requireSociety, requireRole('security_guard')] },
    listStaffForGate
  );
}
