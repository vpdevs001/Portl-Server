import type { onRequestHookHandler } from 'fastify';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../../lib/auth';

type SessionData = typeof auth.$Infer.Session;
type UserType = SessionData['user'];
type SessionType = SessionData['session'];

declare module 'fastify' {
  interface FastifyRequest {
    user: UserType | null;
    session: SessionType | null;
  }
}

export const sessionHook: onRequestHookHandler = async (request) => {
  try {
    const sessionData = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers)
    });

    if (sessionData) {
      request.user = sessionData.user;
      request.session = sessionData.session;
    } else {
      request.user = null;
      request.session = null;
    }
  } catch (error) {
    request.log.error(error, 'Session hook failed');
    request.user = null;
    request.session = null;
  }
};
