import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../../common/errors/app-error.ts';
import { sendSuccess } from '../../common/http/app-response.ts';
import * as service from './amenities.service.ts';
import {
  amenityIdParamsSchema,
  bookAmenitySchema,
  createAmenitySchema,
  listBookingsQuerySchema
} from './amenities.schema.ts';

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

export async function createAmenity(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const dto = createAmenitySchema.parse(request.body);
  const created = await service.createAmenity(caller, dto);

  return sendSuccess(reply, 201, created);
}

export async function listAmenities(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const list = await service.listAmenities(caller);

  return sendSuccess(reply, 200, list);
}

export async function bookAmenity(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const { id } = amenityIdParamsSchema.parse(request.params);
  request.log.debug({ body: request.body }, 'bookAmenity: raw body');
  const dto = bookAmenitySchema.parse(request.body);
  request.log.debug({ amenityId: id, callerId: caller.id, dto }, 'bookAmenity: parsed dto');
  const booking = await service.bookAmenity(caller, id, dto);

  return sendSuccess(reply, 201, booking);
}

export async function listBookings(request: FastifyRequest, reply: FastifyReply) {
  const caller = requireCaller(request);
  const query = listBookingsQuerySchema.parse(request.query);
  const list = await service.listBookings(caller, query);

  return sendSuccess(reply, 200, list);
}
