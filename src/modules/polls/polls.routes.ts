import type { FastifyInstance } from 'fastify';
import { castVote, createPoll, getPollResults, listPolls } from './polls.controllers';
import { requireAuth, requireRole, requireSociety } from '../../common/middleware/auth.middleware';

export async function pollsRoutes(app: FastifyInstance) {
  app.post(
    '/api/polls',
    { preHandler: [requireAuth, requireSociety, requireRole('society_admin')] },
    createPoll
  );

  // Residents/guards/admins all read the list — each poll carries the
  // caller's own vote status, computed inside the service.
  app.get('/api/polls', { preHandler: [requireAuth, requireSociety] }, listPolls);

  app.post('/api/polls/:id/vote', { preHandler: [requireAuth, requireSociety] }, castVote);

  app.get('/api/polls/:id/results', { preHandler: [requireAuth, requireSociety] }, getPollResults);
}
