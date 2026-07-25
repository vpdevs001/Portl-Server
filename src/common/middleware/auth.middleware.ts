import type { preHandlerHookHandler } from 'fastify';
import { AppError } from '../errors/app-error';

type UserRole = 'resident' | 'security_guard' | 'society_admin';

export const requireAuth: preHandlerHookHandler = async (request) => {
  if (!request.user) {
    throw AppError.unauthorized('Authentication required');
  }
};

export function requireRole(...roles: UserRole[]): preHandlerHookHandler {
  return async (request) => {
    if (!request.user) {
      throw AppError.unauthorized('Authentication required');
    }
    if (!request.user.role || !roles.includes(request.user.role as UserRole)) {
      throw AppError.forbidden('Insufficient permissions');
    }
  };
}

export const requireSociety: preHandlerHookHandler = async (request) => {
  if (!request.user) {
    throw AppError.unauthorized('Authentication required');
  }
  if (!request.user.societyId) {
    throw AppError.forbidden('User does not belong to a society');
  }
};
