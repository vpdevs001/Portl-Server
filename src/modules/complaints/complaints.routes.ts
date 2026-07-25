import type { FastifyInstance } from 'fastify';
import { createComplaint, listComplaints, updateComplaintStatus } from './complaints.controllers';
import { requireAuth, requireRole, requireSociety } from '../../common/middleware/auth.middleware';

export async function complaintsRoutes(app: FastifyInstance) {
  app.post(
    '/api/complaints',
    { preHandler: [requireAuth, requireSociety, requireRole('resident')] },
    createComplaint
  );

  // Residents see their own flat's complaints; admins see the whole
  // society's queue — the split happens inside the service based on
  // caller.role, same pattern as notices/polls.
  app.get('/api/complaints', { preHandler: [requireAuth, requireSociety] }, listComplaints);

  app.put(
    '/api/complaints/:id/status',
    { preHandler: [requireAuth, requireSociety, requireRole('society_admin')] },
    updateComplaintStatus
  );
}
