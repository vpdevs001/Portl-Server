import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../../common/errors/app-error';
import { sendSuccess } from '../../common/http/app-response';
import * as service from './polls.service';
import { createPollSchema, pollIdParamsSchema, voteSchema } from './polls.schema';

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

export async function createPoll(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const dto = createPollSchema.parse(request.body);
  const created = await service.createPoll(caller, dto);

  return sendSuccess(reply, 201, created);
}

export async function listPolls(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const list = await service.listPolls(caller);

  return sendSuccess(reply, 200, list);
}

export async function castVote(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const { id } = pollIdParamsSchema.parse(request.params);
  const dto = voteSchema.parse(request.body);
  const results = await service.castVote(caller, id, dto);

  return sendSuccess(reply, 200, results);
}

export async function getPollResults(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const { id } = pollIdParamsSchema.parse(request.params);
  const results = await service.getPollResults(caller, id);

  return sendSuccess(reply, 200, results);
}
