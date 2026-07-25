import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { sendSuccess } from '../../common/http/app-response';
import { AppError } from '../../common/errors/app-error';
import * as service from './invite.service';
import { searchUsersSchema, createInviteSchema, respondInviteSchema } from './invite.schema';

export async function searchUsers(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    throw AppError.unauthorized('Authentication required');
  }

  const { q } = searchUsersSchema.parse(request.query);
  const users = await service.searchUnassignedUsers(q, request.user.id);

  return sendSuccess(reply, 200, users);
}

export async function createInvite(request: FastifyRequest, reply: FastifyReply) {
  const societyId = request.user?.societyId;
  const callerUserId = request.user?.id;
  if (!societyId || !callerUserId) {
    throw AppError.forbidden('No society assigned');
  }

  const dto = createInviteSchema.parse(request.body);
  const invite = await service.createInvite(societyId, callerUserId, dto);

  return sendSuccess(reply, 201, invite);
}

const listSentInvitesQuerySchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected', 'cancelled']).optional()
});

export async function listSentInvites(request: FastifyRequest, reply: FastifyReply) {
  const societyId = request.user?.societyId;
  if (!societyId) {
    throw AppError.forbidden('No society assigned');
  }

  const { status } = listSentInvitesQuerySchema.parse(request.query);
  const invites = await service.listSentInvites(societyId, status);

  return sendSuccess(reply, 200, invites);
}

const inviteParamsSchema = z.object({
  id: z.string().uuid()
});

export async function cancelInvite(request: FastifyRequest, reply: FastifyReply) {
  const societyId = request.user?.societyId;
  if (!societyId) {
    throw AppError.forbidden('No society assigned');
  }

  const { id } = inviteParamsSchema.parse(request.params);
  const invite = await service.cancelInvite(societyId, id);

  return sendSuccess(reply, 200, invite);
}

export async function listMyInvites(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    throw AppError.unauthorized('Authentication required');
  }

  const invites = await service.listMyInvites(request.user.id);
  return sendSuccess(reply, 200, invites);
}

export async function respondToInvite(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    throw AppError.unauthorized('Authentication required');
  }

  const { id } = inviteParamsSchema.parse(request.params);
  const { action } = respondInviteSchema.parse(request.body);
  const result = await service.respondToInvite(request.user.id, id, action);

  return sendSuccess(reply, 200, result);
}
