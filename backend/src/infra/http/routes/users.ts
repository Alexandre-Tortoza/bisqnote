import type { FastifyInstance } from 'fastify'
import type { IUserRepository } from '../../../domain/repositories/IUserRepository.js'
import { RegisterUserUseCase } from '../../../domain/use-cases/RegisterUser.js'
import { AuthenticateUserUseCase } from '../../../domain/use-cases/AuthenticateUser.js'
import { AppError } from '../../../domain/errors/AppError.js'

interface UserRoutesOptions {
  userRepo: IUserRepository
}

const credentialsSchema = {
  type: 'object',
  required: ['username', 'password'],
  properties: {
    // 3–50 alphanumeric/underscore/dash characters — prevents trivially short or
    // unbounded names and reduces username-enumeration surface.
    username: { type: 'string', minLength: 3, maxLength: 50, pattern: '^[a-zA-Z0-9_-]+$' },
    // 8–128 characters — enforces a minimum strength while capping to protect
    // against hash-DoS attacks on the bcrypt layer.
    password: { type: 'string', minLength: 8, maxLength: 128 },
  },
  additionalProperties: false,
}

// Per-route rate-limit config used by @fastify/rate-limit
const authRateLimit = { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env['NODE_ENV'] === 'production',
}

/** User HTTP routes: register and login. */
export async function userRoutes(fastify: FastifyInstance, options: UserRoutesOptions) {
  fastify.post<{ Body: { username: string; password: string } }>(
    '/api/users/register',
    { schema: { body: credentialsSchema }, ...authRateLimit },
    async (request, reply) => {
      const useCase = new RegisterUserUseCase(options.userRepo)
      try {
        const result = await useCase.execute(request.body)
        const token = await reply.jwtSign({ userId: result.userId, username: result.username })
        reply.setCookie('token', token, COOKIE_OPTS)
        return reply.status(201).send({ userId: result.userId, username: result.username })
      } catch (err) {
        if (err instanceof AppError) {
          if (err.code === 'USER_ALREADY_EXISTS') return reply.status(409).send({ error: err.message })
          return reply.status(400).send({ error: err.message })
        }
        throw err
      }
    },
  )

  fastify.post<{ Body: { username: string; password: string } }>(
    '/api/users/login',
    { schema: { body: credentialsSchema }, ...authRateLimit },
    async (request, reply) => {
      const useCase = new AuthenticateUserUseCase(options.userRepo)
      try {
        const result = await useCase.execute(request.body)
        const token = await reply.jwtSign({ userId: result.userId, username: result.username })
        reply.setCookie('token', token, COOKIE_OPTS)
        return reply.send({ userId: result.userId, username: result.username })
      } catch (err) {
        if (err instanceof AppError) {
          if (err.code === 'INVALID_CREDENTIALS') return reply.status(401).send({ error: err.message })
          return reply.status(400).send({ error: err.message })
        }
        throw err
      }
    },
  )
}
