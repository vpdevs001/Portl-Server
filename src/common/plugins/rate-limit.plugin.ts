import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import { ERROR_CODES } from '../errors/error-codes.ts';

/**
 * Chapter 17 — Rate limiting.
 *
 * Registers a generous global default (a backstop against buggy client
 * retry-loops and basic scraping, not a real throttle for normal usage),
 * then individual routes override it via their own `config.rateLimit`
 * passed at `app.route()`/`app.post()` registration — see
 * `auth.routes.ts` and `visitors.routes.ts` for the tightened routes.
 *
 * Responses go through the app's standard error envelope
 * (`{ success: false, error: { code, message } }`) via `errorResponseBuilder`
 * so the client's existing error-handling path doesn't need a 429 special
 * case — it looks like any other `sendError()` response.
 */
export default fp(async (app: FastifyInstance) => {
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    // IP-based by default. Routes that need society-scoped keying (e.g.
    // verify-pass, so one guard device hammering it doesn't lock out a
    // neighboring society) override `keyGenerator` in their own
    // `config.rateLimit`.
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: (_request, context) => ({
      success: false,
      error: {
        code: ERROR_CODES.RATE_LIMITED,
        message: `Too many requests. Please try again in ${context.after}.`,
        details: { max: context.max, ttlMs: context.ttl }
      }
    })
  });
});
