import type { FastifyInstance } from 'fastify'
import type { IBoardRepository } from '../../../domain/repositories/IBoardRepository.js'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IGoBackLinkRepository } from '../../../domain/repositories/IGoBackLinkRepository.js'
import { CreateBoardUseCase } from '../../../domain/use-cases/CreateBoard.js'
import { RecoverBoardsUseCase } from '../../../domain/use-cases/RecoverBoards.js'
import { GetBoardMetaUseCase } from '../../../domain/use-cases/GetBoardMeta.js'
import { JoinBoardUseCase } from '../../../domain/use-cases/JoinBoard.js'
import { AppError } from '../../../domain/errors/AppError.js'

interface BoardRoutesOptions {
  boardRepo: IBoardRepository
  memberRepo: IMemberRepository
  goBackLinkRepo: IGoBackLinkRepository
}

const createBoardSchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name:       { type: 'string', minLength: 1, maxLength: 200 },
    isPrivate:  { type: 'boolean' },
    // Private-board passwords: 8–128 chars — same reasoning as user passwords.
    password:   { type: 'string', minLength: 8, maxLength: 128 },
    ownerEmail: { type: 'string', format: 'email', maxLength: 254 },
  },
  // When isPrivate is true, enforce password at the schema layer as well so
  // invalid requests are rejected before reaching domain logic.
  if:   { properties: { isPrivate: { const: true } }, required: ['isPrivate'] },
  then: { required: ['password'] },
  additionalProperties: false,
}

const recoverSchema = {
  type: 'object',
  required: ['email'],
  properties: {
    email: { type: 'string', format: 'email', maxLength: 254 },
  },
  additionalProperties: false,
}

const joinBoardSchema = {
  type: 'object',
  required: ['boardId'],
  properties: {
    boardId:   { type: 'string', minLength: 1, maxLength: 100 },
    // Join password — same constraints as create to ensure consistent enforcement.
    password:  { type: 'string', minLength: 8, maxLength: 128 },
  },
  additionalProperties: false,
}

/** Board HTTP routes: create, recover, get meta, and join. */
export async function boardRoutes(fastify: FastifyInstance, options: BoardRoutesOptions) {
  fastify.post<{
    Body: { name: string; isPrivate?: boolean; password?: string; ownerEmail?: string }
  }>('/api/boards', { schema: { body: createBoardSchema }, preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { name, isPrivate = false, password, ownerEmail } = request.body

    const useCase = new CreateBoardUseCase(
      options.boardRepo,
      options.memberRepo,
      options.goBackLinkRepo,
      fastify.emailService,
    )

    try {
      const result = await useCase.execute({ userId: request.userId, name, isPrivate, password, ownerEmail })
      return reply.status(201).send(result)
    } catch (err) {
      if (err instanceof AppError) {
        if (err.code === 'INVALID_USER_TOKEN') return reply.status(401).send({ error: err.message })
        return reply.status(400).send({ error: err.message })
      }
      throw err
    }
  })

  fastify.post<{ Body: { email: string } }>(
    '/api/boards/recover',
    {
      schema: { body: recoverSchema },
      // Tight rate limit: sending recovery emails is a prime spam/abuse vector.
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
    },
    async (request, reply) => {
      const useCase = new RecoverBoardsUseCase(
        options.boardRepo,
        options.goBackLinkRepo,
        fastify.emailService,
      )

      // Silent — never reveal whether email exists
      await useCase.execute(request.body.email).catch(() => undefined)
      return reply.send({ sent: true })
    },
  )

  fastify.get<{ Params: { id: string } }>(
    '/api/boards/:id/meta',
    async (request, reply) => {
      const useCase = new GetBoardMetaUseCase(options.boardRepo)
      const meta = await useCase.execute(request.params.id)
      if (!meta) return reply.status(404).send({ error: 'Board not found' })
      return reply.send(meta)
    },
  )

  fastify.post<{ Body: { boardId: string; password?: string } }>(
    '/api/boards/join',
    { schema: { body: joinBoardSchema }, preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const useCase = new JoinBoardUseCase(options.boardRepo, options.memberRepo)

      try {
        const result = await useCase.execute({ boardId: request.body.boardId, password: request.body.password, userId: request.userId })
        return reply.status(201).send(result)
      } catch (err) {
        if (err instanceof AppError) {
          if (err.code === 'BOARD_NOT_FOUND') return reply.status(404).send({ error: err.message })
          if (err.code === 'INVALID_PASSWORD') return reply.status(403).send({ error: err.message })
          if (err.code === 'INVALID_USER_TOKEN') return reply.status(401).send({ error: err.message })
          return reply.status(400).send({ error: err.message })
        }
        throw err
      }
    },
  )
}
