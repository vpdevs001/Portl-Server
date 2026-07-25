import type { FastifyInstance } from 'fastify';
import { getSession, handleAuthRequest } from './auth.controllers';

export async function authRoutes(app: FastifyInstance) {
  // Better Auth's catch-all: covers sign-up, sign-in (email + social), the
  // OAuth callback for each provider (/api/auth/callback/:provider),
  // sign-out, email verification, and every other Better Auth endpoint.
  // See auth.controller.ts for why this must stay a single wildcard route.
  //
  // Chapter 17 — tightened rate limit (default is 300/min globally): this
  // is the OAuth callback surface, keyed by IP to blunt abuse attempts.
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute'
      }
    },
    handler: handleAuthRequest
  });

  // Explicit session route, returned via the app's standard response
  // envelope instead of Better Auth's raw response shape.
  app.get('/api/auth/session', getSession);
}
