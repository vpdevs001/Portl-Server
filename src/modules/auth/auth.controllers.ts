import type { FastifyReply, FastifyRequest } from 'fastify';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../../lib/auth';
import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { sendSuccess } from '../../common/http/app-response';

/**
 * Auth controller
 * ─────────────────────────────────────────────────────────────────────────
 * Better Auth ships as a single framework-agnostic `auth.handler` that
 * internally routes *all* of its own endpoints — email/password sign-up
 * and sign-in, social sign-in, the OAuth `callback/:provider` endpoint,
 * sign-out, email verification, etc.
 *
 * Per the official Fastify integration guide
 * (https://better-auth.com/docs/integrations/fastify — the same pattern
 * documented for Express/every other Node framework), the only supported
 * way to wire this up is a single catch-all route mounted at the
 * configured basePath that forwards the raw request to `auth.handler` and
 * streams its `Response` back. Better Auth does not expose the callback
 * endpoint (or any other individual endpoint) as something that can be
 * mounted on its own route — `handleAuthRequest` below is what actually
 * serves `GET/POST /api/auth/callback/:provider` once a social provider
 * redirects back to us, alongside every other `/api/auth/*` request.
 */

/**
 * Catch-all handler for every Better Auth endpoint, including the OAuth
 * callback route for each configured social provider.
 * Mounted at `GET|POST /api/auth/*` in auth.routes.ts.
 */
export async function handleAuthRequest(request: FastifyRequest, reply: FastifyReply) {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const headers = fromNodeHeaders(request.headers);

    const req = new Request(url.toString(), {
      method: request.method,
      headers,
      ...(request.body ? { body: JSON.stringify(request.body) } : {})
    });

    const response = await auth.handler(req);

    reply.status(response.status);
    response.headers.forEach((value, key) => reply.header(key, value));
    return reply.send(response.body ? await response.text() : null);
  } catch (error) {
    // Better Auth's handler failing (e.g. a malformed OAuth callback, a
    // provider outage) is an auth-specific failure mode we want tagged
    // distinctly from a generic 500 — see ERROR_CODES.AUTH_FAILURE.
    request.log.error({ err: error }, 'Authentication error');
    throw new AppError(500, ERROR_CODES.AUTH_FAILURE, 'Internal authentication error');
  }
}

/**
 * GET /api/auth/session
 * Returns the currently authenticated user + session derived from the
 * request's cookies/headers via Better Auth's server-side session API.
 * Kept as an explicit route (rather than folded into the wildcard above)
 * so it can respond with the app's standard success/error envelope.
 */
export async function getSession(request: FastifyRequest, reply: FastifyReply) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers)
  });

  if (!session) {
    throw AppError.unauthorized('No active session');
  }

  return sendSuccess(reply, 200, session);
}
