import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { sendSuccess } from '../../common/http/app-response';
import { AppError } from '../../common/errors/app-error';
import * as service from './logs.service';
import { listLogsQuerySchema, logResidentSchema, logStaffSchema } from './logs.schema';

const gateSearchQuerySchema = z.object({
  search: z.string().optional(),
  towerId: z.string().uuid().optional(),
  flatId: z.string().uuid().optional()
});

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

export async function logResidentEntry(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const dto = logResidentSchema.parse(request.body);
  const entry = await service.logResident(caller.societyId, caller.id, dto);

  return sendSuccess(reply, dto.action === 'entry' ? 201 : 200, entry);
}

export async function logStaffEntry(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const dto = logStaffSchema.parse(request.body);
  const entry = await service.logStaff(caller.societyId, caller.id, dto);

  return sendSuccess(reply, dto.action === 'entry' ? 201 : 200, entry);
}

export async function listLogs(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const query = listLogsQuerySchema.parse(request.query);
  const logs = await service.listGateLogs(caller, query);

  return sendSuccess(reply, 200, logs);
}

export async function listResidentsForGate(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const query = gateSearchQuerySchema.parse(request.query);
  const residents = await service.listResidentsForGate(caller.societyId, query);
  const statusMap = await service.getResidentCheckInStatus(
    caller.societyId,
    residents.map((resident) => resident.id)
  );

  return sendSuccess(
    reply,
    200,
    residents.map((resident) => ({
      id: resident.id,
      name: resident.name,
      email: resident.email,
      image: resident.image,
      flatId: resident.flatId,
      flatNumber: resident.flat?.flatNumber ?? null,
      towerName: resident.flat?.tower?.name ?? null,
      isInside: Boolean(statusMap[resident.id])
    }))
  );
}

export async function listStaffForGate(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const { search } = gateSearchQuerySchema.parse(request.query);
  const staff = await service.listStaffForGate(caller.societyId, search);
  const statusMap = await service.getStaffCheckInStatus(
    caller.societyId,
    staff.map((member) => member.id)
  );

  return sendSuccess(
    reply,
    200,
    staff.map((member) => ({
      id: member.id,
      name: member.name,
      roleTitle: member.roleTitle,
      phone: member.phone,
      photo: member.photo,
      isInside: Boolean(statusMap[member.id])
    }))
  );
}
