import { ERROR_CODES, type ErrorCode } from './error-codes.ts';

/**
 * AppError is what route handlers throw for all *expected* failure cases.
 *
 * @example
 *   throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Visitor request not found');
 *   throw AppError.notFound('Visitor request not found');
 *
 * The global error-handler plugin (error-handler.plugin.ts) catches every
 * AppError instance and converts it into the standard error envelope.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Maintain proper prototype chain in transpiled environments
    Object.setPrototypeOf(this, new.target.prototype);
  }

  // ─── Static factory helpers ──────────────────────────────────────────────

  /** 404 – real route hit, but the looked-up resource doesn't exist. */
  static notFound(message: string, details?: unknown): AppError {
    return new AppError(404, ERROR_CODES.NOT_FOUND, message, details);
  }

  /** 400 – malformed or semantically invalid request. */
  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(400, ERROR_CODES.BAD_REQUEST, message, details);
  }

  /** 409 – uniqueness or state conflict. */
  static conflict(message: string, details?: unknown): AppError {
    return new AppError(409, ERROR_CODES.CONFLICT, message, details);
  }

  /** 401 – missing or invalid authentication credentials. */
  static unauthorized(message: string, details?: unknown): AppError {
    return new AppError(401, ERROR_CODES.UNAUTHORIZED, message, details);
  }

  /** 403 – authenticated but not permitted to perform the action. */
  static forbidden(message: string, details?: unknown): AppError {
    return new AppError(403, ERROR_CODES.FORBIDDEN, message, details);
  }
}
