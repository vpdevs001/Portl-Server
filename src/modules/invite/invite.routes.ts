import type { FastifyInstance } from 'fastify';
import {
  searchUsers,
  createInvite,
  listSentInvites,
  cancelInvite,
  listMyInvites,
  respondToInvite
} from './invite.controllers';
import { requireAuth, requireRole, requireSociety } from '../../common/middleware/auth.middleware';

export async function inviteRoutes(app: FastifyInstance) {
  // Search unassigned users (only admin can search)
  app.get(
    '/api/invites/search-users',
    { preHandler: [requireAuth, requireSociety, requireRole('society_admin')] },
    searchUsers
  );

  // Send an invite (only admin can send)
  app.post(
    '/api/invites',
    { preHandler: [requireAuth, requireSociety, requireRole('society_admin')] },
    createInvite
  );

  // List sent invites (only admin can view)
  app.get(
    '/api/invites/sent',
    { preHandler: [requireAuth, requireSociety, requireRole('society_admin')] },
    listSentInvites
  );

  // Cancel an invite (only admin can cancel)
  app.delete(
    '/api/invites/:id',
    { preHandler: [requireAuth, requireSociety, requireRole('society_admin')] },
    cancelInvite
  );

  // User's received pending invites (authenticated users, no requireSociety)
  app.get('/api/invites/mine', { preHandler: [requireAuth] }, listMyInvites);

  // Accept/reject invite (authenticated users, no requireSociety)
  app.post('/api/invites/:id/respond', { preHandler: [requireAuth] }, respondToInvite);
}
