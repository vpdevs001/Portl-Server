import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../../common/errors/app-error';
import { sendSuccess } from '../../common/http/app-response';
import * as service from './notifications.service';
import { registerPushTokenSchema, unregisterTokenParamSchema } from './notifications.schema';

export async function registerPushToken(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    throw AppError.unauthorized('Authentication required');
  }

  const dto = registerPushTokenSchema.parse(request.body);
  const token = await service.registerPushToken(request.user.id, dto);

  return sendSuccess(reply, 201, token);
}

export async function unregisterPushToken(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    throw AppError.unauthorized('Authentication required');
  }

  const { token } = unregisterTokenParamSchema.parse(request.params);
  await service.unregisterPushToken(request.user.id, token);

  return sendSuccess(reply, 200, { message: 'Push token unregistered' });
}
