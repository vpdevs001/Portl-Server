import type { FastifyInstance } from 'fastify';
import {
  createSociety,
  getSocietyDetailsMe,
  createTower,
  listTowers,
  createFlat,
  updateFlat,
  listFlats,
  listMembers,
  leaveSociety,
  removeMember,
  updateSocietyUpiId,
  updateSocietyDetails
} from './society.controllers';
import { requireAuth, requireRole, requireSociety } from '../../common/middleware/auth.middleware';

export async function societyRoutes(app: FastifyInstance) {
  // Societies
  app.post('/api/societies', { preHandler: [requireAuth] }, createSociety);
  app.get('/api/societies/me', { preHandler: [requireAuth, requireSociety] }, getSocietyDetailsMe);
  app.put(
    '/api/societies/me',
    { preHandler: [requireAuth, requireSociety, requireRole('society_admin')] },
    updateSocietyDetails
  );
  app.put(
    '/api/societies/upi',
    { preHandler: [requireAuth, requireSociety, requireRole('society_admin')] },
    updateSocietyUpiId
  );

  // Towers
  app.post(
    '/api/societies/towers',
    { preHandler: [requireAuth, requireSociety, requireRole('society_admin')] },
    createTower
  );
  app.get('/api/societies/towers', { preHandler: [requireAuth, requireSociety] }, listTowers);

  // Flats
  app.post(
    '/api/societies/flats',
    { preHandler: [requireAuth, requireSociety, requireRole('society_admin')] },
    createFlat
  );
  app.get('/api/societies/flats', { preHandler: [requireAuth, requireSociety] }, listFlats);
  app.put(
    '/api/societies/flats/:id',
    { preHandler: [requireAuth, requireSociety, requireRole('society_admin')] },
    updateFlat
  );

  // Members
  app.get('/api/societies/members', { preHandler: [requireAuth, requireSociety] }, listMembers);

  // Any member (resident, guard, or admin) leaving of their own accord.
  app.post('/api/societies/leave', { preHandler: [requireAuth, requireSociety] }, leaveSociety);

  // Admin-initiated removal of another member.
  app.delete(
    '/api/societies/members/:userId',
    { preHandler: [requireAuth, requireSociety, requireRole('society_admin')] },
    removeMember
  );
}
