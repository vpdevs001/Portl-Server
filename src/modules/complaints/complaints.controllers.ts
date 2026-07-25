import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../../common/errors/app-error';
import { sendSuccess } from '../../common/http/app-response';
import * as service from './complaints.service';
import {
  complaintIdParamsSchema,
  createComplaintSchema,
  updateComplaintStatusSchema
} from './complaints.schema';

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

export async function createComplaint(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const dto = createComplaintSchema.parse(request.body);
  const created = await service.createComplaint(caller, dto);

  return sendSuccess(reply, 201, created);
}

export async function listComplaints(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const list = await service.listComplaints(caller);

  return sendSuccess(reply, 200, list);
}

export async function updateComplaintStatus(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const { id } = complaintIdParamsSchema.parse(request.params);
  const dto = updateComplaintStatusSchema.parse(request.body);
  const updated = await service.updateComplaintStatus(caller, id, dto);

  return sendSuccess(reply, 200, updated);
}
