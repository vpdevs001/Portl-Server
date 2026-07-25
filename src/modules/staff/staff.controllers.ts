import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../../common/errors/app-error.ts';
import { sendSuccess } from '../../common/http/app-response.ts';
import * as service from './staff.service.ts';
import {
  createStaffSchema,
  listStaffQuerySchema,
  staffIdParamSchema,
  updateStaffSchema
} from './staff.schema.ts';

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

export async function createStaff(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const dto = createStaffSchema.parse(request.body);
  const created = await service.createStaff(caller, dto);

  return sendSuccess(reply, 201, created);
}

export async function updateStaff(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const { id } = staffIdParamSchema.parse(request.params);
  const dto = updateStaffSchema.parse(request.body);
  const updated = await service.updateStaff(caller, id, dto);

  return sendSuccess(reply, 200, updated);
}

export async function listStaff(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const query = listStaffQuerySchema.parse(request.query);
  const list = await service.listStaff(caller, query);

  return sendSuccess(reply, 200, list);
}

export async function removeStaff(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const { id } = staffIdParamSchema.parse(request.params);
  await service.removeStaff(caller, id);

  return sendSuccess(reply, 200, { message: 'Staff member removed successfully' });
}
