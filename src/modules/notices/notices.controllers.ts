import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { sendSuccess } from '../../common/http/app-response';
import { AppError } from '../../common/errors/app-error';
import * as service from './notices.service';
import {
  createEmergencyAlertSchema,
  createNoticeSchema,
  listNoticesQuerySchema,
  updateNoticeSchema
} from './notices.schema';

const noticeIdParamsSchema = z.object({ id: z.string().uuid() });

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
    role: request.user.role as 'resident' | 'security_guard' | 'society_admin'
  };
}

export async function createNotice(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const dto = createNoticeSchema.parse(request.body);
  const created = await service.createNotice(caller, dto);

  return sendSuccess(reply, 201, created);
}

export async function createEmergencyAlert(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const dto = createEmergencyAlertSchema.parse(request.body);
  const created = await service.createEmergencyAlert(caller, dto);

  return sendSuccess(reply, 201, created);
}

export async function listNotices(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const query = listNoticesQuerySchema.parse(request.query);
  const list = await service.listNotices(caller, query);

  return sendSuccess(reply, 200, list);
}

export async function updateNotice(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const { id } = noticeIdParamsSchema.parse(request.params);
  const dto = updateNoticeSchema.parse(request.body);
  const updated = await service.updateNotice(caller, id, dto);

  return sendSuccess(reply, 200, updated);
}

export async function deleteNotice(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const { id } = noticeIdParamsSchema.parse(request.params);
  await service.deleteNotice(caller, id);

  return sendSuccess(reply, 200, { id });
}
