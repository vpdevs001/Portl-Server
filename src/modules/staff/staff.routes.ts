import type { FastifyInstance } from 'fastify';
import { createStaff, listStaff, removeStaff, updateStaff } from './staff.controllers';
import { requireAuth, requireRole, requireSociety } from '../../common/middleware/auth.middleware';

export async function staffRoutes(app: FastifyInstance) {
  app.post(
    '/api/staff',
    { preHandler: [requireAuth, requireSociety, requireRole('society_admin')] },
    createStaff
  );

  app.put(
    '/api/staff/:id',
    { preHandler: [requireAuth, requireSociety, requireRole('society_admin')] },
    updateStaff
  );

  app.get('/api/staff', { preHandler: [requireAuth, requireSociety] }, listStaff);

  app.delete(
    '/api/staff/:id',
    { preHandler: [requireAuth, requireSociety, requireRole('society_admin')] },
    removeStaff
  );
}
