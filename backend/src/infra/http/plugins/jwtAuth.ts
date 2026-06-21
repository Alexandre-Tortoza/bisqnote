import fp from 'fastify-plugin'
import fastifyCookie from '@fastify/cookie'
import fastifyJwt from '@fastify/jwt'
import type { FastifyReply } from 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    userId: string
  }
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>
  }
}

/**
 * JWT authentication plugin.
 * Registers cookie parsing and JWT signing/verification,
 * then decorates fastify with an `authenticate` preHandler
 * that reads the JWT from the `token` cookie and sets `request.userId`.
 */
export const jwtAuthPlugin = fp(async (fastify) => {
  const secret = process.env['JWT_SECRET'] ?? 'change-me-in-production'

  await fastify.register(fastifyCookie)
  await fastify.register(fastifyJwt, { secret })

  fastify.decorateRequest('userId', '')

  fastify.decorate('authenticate', async (request, reply) => {
    const token = request.cookies?.['token']
    if (!token) {
      return reply.status(401).send({ error: 'Missing authentication token' })
    }

    try {
      const decoded = fastify.jwt.verify<{ userId: string }>(token)
      request.userId = decoded.userId
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired token' })
    }
  })
})
