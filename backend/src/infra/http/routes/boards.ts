import type { FastifyInstance } from 'fastify'
import type { IBoardRepository } from '../../../domain/repositories/IBoardRepository.js'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IGoBackLinkRepository } from '../../../domain/repositories/IGoBackLinkRepository.js'
import type { IUserRepository } from '../../../domain/repositories/IUserRepository.js'
import { CreateBoardUseCase } from '../../../domain/use-cases/CreateBoard.js'
import { RecoverBoardsUseCase } from '../../../domain/use-cases/RecoverBoards.js'
import { GetBoardMetaUseCase } from '../../../domain/use-cases/GetBoardMeta.js'
import { JoinBoardUseCase } from '../../../domain/use-cases/JoinBoard.js'
import { AppError } from '../../../domain/errors/AppError.js'

interface BoardRoutesOptions {
  boardRepo: IBoardRepository
  memberRepo: IMemberRepository
  goBackLinkRepo: IGoBackLinkRepository
  userRepo: IUserRepository
}

const createBoardSchema = {
  type: 'object',
  required: ['name', 'userToken'],
  properties: {
    name:       { type: 'string', minLength: 1 },
    isPrivate:  { type: 'boolean' },
    password:   { type: 'string' },
    ownerEmail: { type: 'string', format: 'email' },
    userToken:  { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
}

const recoverSchema = {
  type: 'object',
  required: ['email'],
  properties: {
    email: { type: 'string', format: 'email' },
  },
  additionalProperties: false,
}

const joinBoardSchema = {
  type: 'object',
  required: ['boardId', 'userToken'],
  properties: {
    boardId:   { type: 'string', minLength: 1 },
    password:  { type: 'string' },
    userToken: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
}

/** Board HTTP routes: create, recover, get meta, and join. */
export async function boardRoutes(fastify: FastifyInstance, options: BoardRoutesOptions) {
  fastify.post<{
    Body: { name: string; isPrivate?: boolean; password?: string; ownerEmail?: string; userToken: string }
  }>('/api/boards', { schema: { body: createBoardSchema } }, async (request, reply) => {
    const { name, isPrivate = false, password, ownerEmail, userToken } = request.body

    const useCase = new CreateBoardUseCase(
      options.boardRepo,
      options.memberRepo,
      options.goBackLinkRepo,
      fastify.emailService,
      options.userRepo,
    )

    try {
      const result = await useCase.execute({ name, isPrivate, password, ownerEmail, userToken })
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
    { schema: { body: recoverSchema } },
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

  fastify.post<{ Body: { boardId: string; password?: string; userToken: string } }>(
    '/api/boards/join',
    { schema: { body: joinBoardSchema } },
    async (request, reply) => {
      const useCase = new JoinBoardUseCase(options.boardRepo, options.memberRepo, options.userRepo)

      try {
        const result = await useCase.execute(request.body)
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
