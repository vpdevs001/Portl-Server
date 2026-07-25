import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../../common/errors/app-error';
import { sendSuccess } from '../../common/http/app-response';
import * as service from './payments.service';
import {
  confirmPaymentSchema,
  idParamsSchema,
  listDuesQuerySchema,
  setDueStatusSchema,
  verifyPaymentSchema
} from './payments.schema';

function requireCaller(request: FastifyRequest) {
  if (!request.user) {
    throw AppError.unauthorized('Authentication required');
  }
  if (!request.user.societyId) {
    throw AppError.forbidden('No society assigned');
  }
  if (!request.user.role) {
    throw AppError.forbidden('No role assigned');
  }

  return {
    id: request.user.id,
    societyId: request.user.societyId,
    role: request.user.role as 'resident' | 'security_guard' | 'society_admin',
    flatId: request.user.flatId ?? null
  };
}

export async function listDues(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const query = listDuesQuerySchema.parse(request.query);
  const dues = await service.listDues(caller, query);

  return sendSuccess(reply, 200, dues);
}

export async function setDueStatus(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const { id } = idParamsSchema.parse(request.params);
  const dto = setDueStatusSchema.parse(request.body);
  const updated = await service.setDueStatus(caller, id, dto);

  return sendSuccess(reply, 200, updated);
}

export async function confirmPayment(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const dto = confirmPaymentSchema.parse(request.body);
  const confirmation = await service.confirmPayment(caller, dto);

  return sendSuccess(reply, 201, confirmation);
}

export async function verifyPayment(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const { id } = idParamsSchema.parse(request.params);
  const dto = verifyPaymentSchema.parse(request.body);
  const updated = await service.verifyPayment(caller, id, dto);

  return sendSuccess(reply, 200, updated);
}
