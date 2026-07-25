import type { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { auth } from './auth';

/**
 * Live-polling transport for Chapter 11 (Polls). Kept intentionally small:
 * one room per society, two events (`poll:created`, `poll:results`). Every
 * connected client — resident, guard, or admin — gets pushed the same
 * aggregate updates the REST endpoints would otherwise require polling for.
 *
 * Auth mirrors the REST session hook (session.hook.ts) but Better Auth's
 * `getSession` needs real request headers, and React Native's WebSocket
 * transport can't attach custom headers the way XHR/polling can. So the
 * client instead sends its Better Auth cookie string inside the Socket.IO
 * handshake's `auth` payload (see client/src/lib/socket.ts), and we build a
 * synthetic `Headers` object from it here to hand to `auth.api.getSession`.
 */

type SocketData = {
  userId: string;
  societyId: string;
};

type AppSocketServer = SocketIOServer<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  SocketData
>;

let io: AppSocketServer | null = null;

function societyRoom(societyId: string) {
  return `society:${societyId}:polls`;
}

export function initSocket(httpServer: HTTPServer, corsOrigins: string[] | boolean) {
  io = new SocketIOServer<
    Record<string, never>,
    Record<string, never>,
    Record<string, never>,
    SocketData
  >(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const cookie =
        (socket.handshake.auth?.cookie as string | undefined) ?? socket.handshake.headers.cookie;

      if (!cookie) {
        next(new Error('Authentication required'));
        return;
      }

      const sessionData = await auth.api.getSession({ headers: new Headers({ cookie }) });

      if (!sessionData?.user?.societyId) {
        next(new Error('Authentication required'));
        return;
      }

      socket.data.userId = sessionData.user.id;
      socket.data.societyId = sessionData.user.societyId;
      next();
    } catch {
      next(new Error('Authentication required'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(societyRoom(socket.data.societyId));
  });

  return io;
}

/** Fire-and-forget: never throws if the socket layer isn't up (e.g. tests). */
export function emitPollCreated(societyId: string, payload: unknown) {
  io?.to(societyRoom(societyId)).emit('poll:created', payload);
}

/** Fire-and-forget: pushes fresh vote aggregates to every connected client. */
export function emitPollResults(societyId: string, payload: unknown) {
  io?.to(societyRoom(societyId)).emit('poll:results', payload);
}
