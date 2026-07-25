/**
 * Single source of truth for all API error code strings.
 * Every module in the app should import from here — never hardcode error code
 * strings inline. Add new codes to this file as new chapters introduce them.
 */
export const ERROR_CODES = {
  // 404 – a real endpoint was hit but the queried resource doesn't exist (business-logic 404)
  NOT_FOUND: 'NOT_FOUND',

  // 400 – malformed input or invalid request semantics
  BAD_REQUEST: 'BAD_REQUEST',

  // 409 – a uniqueness constraint was violated (e.g. duplicate email)
  CONFLICT: 'CONFLICT',

  // 401 – missing or invalid authentication credentials
  UNAUTHORIZED: 'UNAUTHORIZED',

  // 403 – authenticated but not permitted to perform the action
  FORBIDDEN: 'FORBIDDEN',

  // 400 – request body / params / query failed Zod schema validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // 400 – a foreign-key reference points to a record that doesn't exist (PG 23503)
  INVALID_REFERENCE: 'INVALID_REFERENCE',

  // 400 – a required field was NULL when it shouldn't be (PG 23502)
  MISSING_FIELD: 'MISSING_FIELD',

  // 500 – a Postgres error that isn't mapped to a more specific code above
  DATABASE_ERROR: 'DATABASE_ERROR',

  // 404 – no route (path + method combination) is registered for this URL
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',

  // 500 – any other unhandled/unexpected error
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',

  // 500 – the Better Auth request handler itself threw (auth.controller.ts)
  AUTH_FAILURE: 'AUTH_FAILURE',

  // 502 – an upstream file-storage provider (ImageKit) rejected or failed an upload
  UPLOAD_FAILED: 'UPLOAD_FAILED',

  // 429 – Chapter 17: caller exceeded the request budget for this route (@fastify/rate-limit)
  RATE_LIMITED: 'RATE_LIMITED'
} as const;

/** Union type of every valid error code string. */
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
