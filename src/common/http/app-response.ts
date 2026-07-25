import type { FastifyReply } from 'fastify';

// ─── Response envelope types ─────────────────────────────────────────────────

/**
 * Standard shape for every successful API response.
 * Route handlers should use `sendSuccess` (or return this shape directly)
 * rather than calling `reply.send` with an ad-hoc payload.
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Standard shape for every error API response.
 * Route handlers should use `sendError` (or throw an `AppError`) rather than
 * calling `reply.send` with an ad-hoc payload.
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ─── Helper functions ─────────────────────────────────────────────────────────

/**
 * Send a successful response with the standard envelope.
 *
 * @example
 *   sendSuccess(reply, 200, { id: '...', name: '...' });
 *   sendSuccess(reply, 201, createdRecord);
 */
export function sendSuccess(reply: FastifyReply, statusCode: number, data: unknown): void {
  const body: SuccessResponse<unknown> = { success: true, data };
  reply.status(statusCode).send(body);
}

/**
 * Send an error response with the standard envelope.
 *
 * @example
 *   sendError(reply, 404, ERROR_CODES.NOT_FOUND, 'Visitor request not found');
 */
export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): void {
  const body: ErrorResponse = {
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) }
  };
  reply.status(statusCode).send(body);
}
