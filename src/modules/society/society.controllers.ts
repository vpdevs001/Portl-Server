import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { sendSuccess } from '../../common/http/app-response';
import { AppError } from '../../common/errors/app-error';
import * as service from './society.service';
import {
  createSocietySchema,
  createTowerSchema,
  createFlatSchema,
  updateFlatSchema,
  updateSocietyUpiIdSchema,
  updateSocietyDetailsSchema
} from './society.schema';

export async function createSociety(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    throw AppError.unauthorized('Authentication required');
  }

  const dto = createSocietySchema.parse(request.body);
  const society = await service.createSocietyAndAssignAdmin(request.user.id, dto);

  return sendSuccess(reply, 201, society);
}

export async function getSocietyDetailsMe(request: FastifyRequest, reply: FastifyReply) {
  const societyId = request.user?.societyId;
  if (!societyId) {
    throw AppError.forbidden('No society assigned');
  }

  const details = await service.getSocietyDetails(societyId);
  return sendSuccess(reply, 200, details);
}

export async function createTower(request: FastifyRequest, reply: FastifyReply) {
  const societyId = request.user?.societyId;
  if (!societyId) {
    throw AppError.forbidden('No society assigned');
  }

  const dto = createTowerSchema.parse(request.body);
  const tower = await service.createTower(societyId, dto);

  return sendSuccess(reply, 201, tower);
}

export async function listTowers(request: FastifyRequest, reply: FastifyReply) {
  const societyId = request.user?.societyId;
  if (!societyId) {
    throw AppError.forbidden('No society assigned');
  }

  const towers = await service.listTowers(societyId);
  return sendSuccess(reply, 200, towers);
}

export async function createFlat(request: FastifyRequest, reply: FastifyReply) {
  const societyId = request.user?.societyId;
  if (!societyId) {
    throw AppError.forbidden('No society assigned');
  }

  const dto = createFlatSchema.parse(request.body);
  const flat = await service.createFlat(societyId, dto);

  return sendSuccess(reply, 201, flat);
}

const flatIdParamsSchema = z.object({ id: z.string().uuid() });

export async function updateFlat(request: FastifyRequest, reply: FastifyReply) {
  const societyId = request.user?.societyId;
  if (!societyId) {
    throw AppError.forbidden('No society assigned');
  }

  const { id } = flatIdParamsSchema.parse(request.params);
  const dto = updateFlatSchema.parse(request.body);
  const flat = await service.updateFlat(societyId, id, dto);

  return sendSuccess(reply, 200, flat);
}

const listFlatsQuerySchema = z.object({
  towerId: z.string().uuid().optional()
});

export async function listFlats(request: FastifyRequest, reply: FastifyReply) {
  const societyId = request.user?.societyId;
  if (!societyId) {
    throw AppError.forbidden('No society assigned');
  }

  const { towerId } = listFlatsQuerySchema.parse(request.query);
  const flats = await service.listFlats(societyId, towerId);

  return sendSuccess(reply, 200, flats);
}

const listMembersQuerySchema = z.object({
  role: z.enum(['resident', 'security_guard', 'society_admin']).optional()
});

export async function listMembers(request: FastifyRequest, reply: FastifyReply) {
  const societyId = request.user?.societyId;
  if (!societyId) {
    throw AppError.forbidden('No society assigned');
  }

  const { role } = listMembersQuerySchema.parse(request.query);
  const members = await service.listMembers(societyId, role);

  return sendSuccess(reply, 200, members);
}

export async function leaveSociety(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    throw AppError.unauthorized('Authentication required');
  }

  const result = await service.leaveSociety(request.user.id);
  return sendSuccess(reply, 200, result);
}

const removeMemberParamsSchema = z.object({ userId: z.string().uuid() });

export async function removeMember(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    throw AppError.unauthorized('Authentication required');
  }

  const societyId = request.user.societyId;
  if (!societyId) {
    throw AppError.forbidden('No society assigned');
  }

  const { userId } = removeMemberParamsSchema.parse(request.params);
  const result = await service.removeMember(societyId, request.user.id, userId);

  return sendSuccess(reply, 200, result);
}

export async function updateSocietyUpiId(request: FastifyRequest, reply: FastifyReply) {
  const societyId = request.user?.societyId;
  if (!societyId) {
    throw AppError.forbidden('No society assigned');
  }

  const { upiId } = updateSocietyUpiIdSchema.parse(request.body);
  const society = await service.updateSocietyUpiId(societyId, upiId);

  return sendSuccess(reply, 200, society);
}

export async function updateSocietyDetails(request: FastifyRequest, reply: FastifyReply) {
  const societyId = request.user?.societyId;
  if (!societyId) {
    throw AppError.forbidden('No society assigned');
  }

  const dto = updateSocietyDetailsSchema.parse(request.body);
  const society = await service.updateSocietyDetails(societyId, dto);

  return sendSuccess(reply, 200, society);
}
