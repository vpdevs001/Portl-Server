import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { sessionHook } from '../hooks/session.hook';

export default fp(async (app: FastifyInstance) => {
  app.addHook('onRequest', sessionHook);
});
