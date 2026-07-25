import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendSuccess } from '../../common/http/app-response';
import { AppError } from '../../common/errors/app-error';
import * as service from './visitors.service';
import {
  createPreApprovalSchema,
  createVisitorRequestSchema,
  respondVisitorRequestSchema,
  uploadVisitorPhotoSchema,
  verifyPassSchema
} from './visitors.schema';
import { z } from 'zod';

const visitorIdSchema = z.object({ id: z.string().uuid() });

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

export async function createVisitorRequest(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const dto = createVisitorRequestSchema.parse(request.body);
  const created = await service.createVisitorRequest(caller.societyId, caller.id, dto);

  return sendSuccess(reply, 201, created);
}

export async function listPendingVisitors(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  // Which requests a caller sees (all/gate vs. own-flat vs. admin-routed)
  // is derived server-side from the caller's own role — never trusted from
  // client input.
  const requests = await service.listPendingRequests(caller);

  return sendSuccess(reply, 200, requests);
}

export async function respondToVisitorRequest(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const { id } = visitorIdSchema.parse(request.params);
  const dto = respondVisitorRequestSchema.parse(request.body);
  const updated = await service.respondToVisitorRequest(caller, id, dto);

  return sendSuccess(reply, 200, updated);
}

export async function logVisitorEntry(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const { id } = visitorIdSchema.parse(request.params);
  const entry = await service.logEntry(caller.societyId, caller.id, id);

  return sendSuccess(reply, 201, entry);
}

export async function logVisitorExit(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const { id } = visitorIdSchema.parse(request.params);
  const entry = await service.logExit(caller.societyId, caller.id, id);

  return sendSuccess(reply, 200, entry);
}

export async function uploadVisitorPhoto(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    throw AppError.unauthorized('Authentication required');
  }

  const dto = uploadVisitorPhotoSchema.parse(request.body);
  const result = await service.uploadVisitorPhoto(dto);

  return sendSuccess(reply, 201, result);
}

// ─── Chapter 8 — Pre-Approvals ──────────────────────────────────────────────

export async function createPreApproval(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const dto = createPreApprovalSchema.parse(request.body);
  const created = await service.createPreApproval(caller, dto);

  return sendSuccess(reply, 201, created);
}

export async function listPreApprovals(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const preApprovals = await service.listPreApprovals(caller);

  return sendSuccess(reply, 200, preApprovals);
}

export async function verifyPass(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const dto = verifyPassSchema.parse(request.body);
  const result = await service.verifyPass(caller, dto);

  return sendSuccess(reply, 200, result);
}

export async function listCheckedInVisitors(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const visitors = await service.listCheckedInVisitors(caller);

  return sendSuccess(reply, 200, visitors);
}
