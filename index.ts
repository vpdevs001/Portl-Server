import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';

import dbPlugin from './src/common/plugins/db.plugin.ts';
import sessionPlugin from './src/common/plugins/session.plugin.ts';
import errorHandlerPlugin from './src/common/plugins/error-handler.plugin.ts';
import rateLimitPlugin from './src/common/plugins/rate-limit.plugin.ts';

import { sendError } from './src/common/http/app-response.ts';
import { ERROR_CODES } from './src/common/errors/error-codes.ts';
import { healthRoutes } from './src/modules/health/health.routes.ts';
import { authRoutes } from './src/modules/auth/auth.routes.ts';
import { societyRoutes } from './src/modules/society/society.routes.ts';
import { inviteRoutes } from './src/modules/invite/invite.routes.ts';
import { visitorsRoutes } from './src/modules/visitors/visitors.routes.ts';
import { logsRoutes } from './src/modules/logs/logs.routes.ts';
import { noticesRoutes } from './src/modules/notices/notices.routes.ts';
import { pollsRoutes } from './src/modules/polls/polls.routes.ts';
import { amenitiesRoutes } from './src/modules/amenities/amenities.routes.ts';
import { complaintsRoutes } from './src/modules/complaints/complaints.routes.ts';
import { staffRoutes } from './src/modules/staff/staff.routes.ts';
import { paymentsRoutes } from './src/modules/payments/payments.routes.ts';
import { notificationsRoutes } from './src/modules/notifications/notifications.routes.ts';
import { initSocket } from './src/lib/socket.ts';
import env from './env.ts';

async function buildServer() {
  // ── Logging: pino-pretty in dev, structured JSON in production ─────────────
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV === 'production'
          ? undefined
          : {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss',
                ignore: 'pid,hostname'
              }
            }
    }
  });

  // ── Zod type provider (must be before any route that uses Zod schemas) ──────
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_, body, done) => {
    const rawBody = typeof body === 'string' ? body : body.toString('utf8');

    if (rawBody.length === 0) {
      done(null, {});
      return;
    }

    try {
      done(null, JSON.parse(rawBody));
    } catch (error) {
      done(error as Error, undefined);
    }
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // ── Security headers (CSP disabled — pure JSON API, not a browser app) ──────
  await app.register(helmet, { contentSecurityPolicy: false });

  // ── CORS ─────────────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: env.CORS_ORIGINS.length ? env.CORS_ORIGINS : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  });

  // ── Global error handler (register before routes so it covers everything) ───
  await app.register(errorHandlerPlugin);

  // ── Database ─────────────────────────────────────────────────────────────────
  await app.register(dbPlugin);

  // ── Session Hook ─────────────────────────────────────────────────────────────
  await app.register(sessionPlugin);

  // ── Rate Limiting (Chapter 17) ────────────────────────────────────────────────
  // Registered after the session hook so per-route keyGenerators (e.g.
  // verify-pass keying on societyId) can read request.user.
  await app.register(rateLimitPlugin);

  // ── Not Found handler ─────────────────────────────────────────────────────────
  // Case 5a: routing-layer 404 — no path/method combination is registered.
  // Uses code ROUTE_NOT_FOUND (distinct from NOT_FOUND which is a business-logic
  // 404 thrown by route handlers via AppError.notFound).
  app.setNotFoundHandler((request, reply) => {
    sendError(
      reply,
      404,
      ERROR_CODES.ROUTE_NOT_FOUND,
      `Route ${request.method} ${request.url} not found`
    );
  });

  // ── Routes ────────────────────────────────────────────────────────────────────
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(societyRoutes);
  await app.register(inviteRoutes);
  await app.register(visitorsRoutes);
  await app.register(logsRoutes);
  await app.register(noticesRoutes);
  await app.register(pollsRoutes);
  await app.register(amenitiesRoutes);
  await app.register(complaintsRoutes);
  await app.register(staffRoutes);
  await app.register(paymentsRoutes);
  await app.register(notificationsRoutes);

  // ── Live polling (Chapter 11) ───────────────────────────────────────────────
  // Attaches to the same underlying Node HTTP server Fastify wraps, so it
  // shares the port/listen call below rather than needing its own.
  initSocket(app.server, env.CORS_ORIGINS.length ? env.CORS_ORIGINS : true);

  return app;
}

async function start() {
  const app = await buildServer();
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
