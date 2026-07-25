import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.ts';
import { ERROR_CODES } from '../errors/error-codes.ts';
import { sendError } from '../http/app-response.ts';

/**
 * Global error handler plugin.
 *
 * NOTE on the database driver:
 * This project uses `drizzle-orm/node-postgres` with a standard `pg.Pool`
 * (TCP driver, NOT @neondatabase/serverless HTTP driver). Postgres errors from
 * `pg` reliably expose a `.code` property as a 5-character SQLSTATE string —
 * the same shape as a standard `pg` DatabaseError. No adaptation is needed;
 * we can check `(error as any).code` directly.
 *
 * Priority order of error handling:
 *   1. AppError            – expected business-logic errors thrown by route handlers
 *   2. ZodError            – schema validation failure (raw ZodError or wrapped FastifyError)
 *   3. Postgres SQLSTATE   – database constraint violations mapped to HTTP responses
 *   4. Fallback            – any other unhandled error → 500 with generic message
 */
export default fp(async (app: FastifyInstance) => {
  app.setErrorHandler((error, _, reply) => {
    // ── 1. AppError ──────────────────────────────────────────────────────────
    if (error instanceof AppError) {
      return sendError(reply, error.statusCode, error.code, error.message, error.details);
    }

    // ── 2. ZodError ──────────────────────────────────────────────────────────
    // fastify-type-provider-zod's validatorCompiler can surface validation
    // failures in two ways depending on Fastify's internal wrapping:
    //   a) A raw ZodError instance (error instanceof ZodError)
    //   b) A FastifyError that wraps a ZodError in its `.validation` property
    //      (a FastifySchemaValidationError where error.validation is a ZodError)
    //
    // We handle both shapes here. The `cause` of a FastifyError is also
    // checked because newer builds of fastify-type-provider-zod set `.cause`
    // to the underlying ZodError.
    const zodError =
      error instanceof ZodError
        ? error
        : (error as { validation?: unknown; cause?: unknown }).validation instanceof ZodError
          ? (error as { validation: ZodError }).validation
          : (error as { cause?: unknown }).cause instanceof ZodError
            ? (error as { cause: ZodError }).cause
            : null;

    if (zodError) {
      app.log.warn({ issues: zodError.issues }, 'Validation error');
      return sendError(
        reply,
        400,
        ERROR_CODES.VALIDATION_ERROR,
        'Request validation failed',
        zodError.issues
      );
    }

    // ── 3. Postgres SQLSTATE errors ──────────────────────────────────────────
    // `pg` DatabaseError exposes SQLSTATE codes as a 5-character string on the
    // `.code` property. We distinguish it from Fastify's numeric `.statusCode`
    // by checking that it's a string of exactly 5 characters.
    const pgCode = (error as { code?: unknown }).code;
    if (typeof pgCode === 'string' && pgCode.length === 5) {
      switch (pgCode) {
        case '23505': // unique_violation
          return sendError(
            reply,
            409,
            ERROR_CODES.CONFLICT,
            'A record with this value already exists'
          );

        case '23503': // foreign_key_violation
          app.log.warn({ pgCode, detail: (error as { detail?: string }).detail }, 'FK violation');
          return sendError(
            reply,
            400,
            ERROR_CODES.INVALID_REFERENCE,
            'Referenced record does not exist'
          );

        case '23502': // not_null_violation
          app.log.warn(
            { pgCode, column: (error as { column?: string }).column },
            'NOT NULL violation'
          );
          return sendError(reply, 400, ERROR_CODES.MISSING_FIELD, 'A required field is missing');

        default:
          // Other Postgres errors: log the full error server-side, send generic
          // message to client (never leak raw Postgres messages to the client)
          app.log.error(error, 'Unhandled Postgres error');
          return sendError(
            reply,
            500,
            ERROR_CODES.DATABASE_ERROR,
            'A database error occurred. Please try again.'
          );
      }
    }

    // ── 4. Fallback: any other unhandled error ───────────────────────────────
    // Always log the real error server-side regardless of environment.
    app.log.error(error, 'Unhandled server error');

    const isDev = process.env.NODE_ENV !== 'production';
    return sendError(
      reply,
      500,
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      'Something went wrong. Please try again.',
      // In development, include error details to speed up debugging; strip in production.
      isDev ? { message: (error as Error).message, stack: (error as Error).stack } : undefined
    );
  });
});
