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
    username: { type: 'string', minLength: 1 },
    password: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
}

/** User HTTP routes: register and login. */
export async function userRoutes(fastify: FastifyInstance, options: UserRoutesOptions) {
  fastify.post<{ Body: { username: string; password: string } }>(
    '/api/users/register',
    { schema: { body: credentialsSchema } },
    async (request, reply) => {
      const useCase = new RegisterUserUseCase(options.userRepo)
      try {
        const result = await useCase.execute(request.body)
        return reply.status(201).send(result)
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
    { schema: { body: credentialsSchema } },
    async (request, reply) => {
      const useCase = new AuthenticateUserUseCase(options.userRepo)
      try {
        const result = await useCase.execute(request.body)
        return reply.send(result)
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
