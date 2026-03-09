import type { FastifyInstance } from 'fastify'
import type { IBoardRepository } from '../../../domain/repositories/IBoardRepository.js'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IGoBackLinkRepository } from '../../../domain/repositories/IGoBackLinkRepository.js'
import { CreateBoardUseCase } from '../../../domain/use-cases/CreateBoard.js'
import { RecoverBoardsUseCase } from '../../../domain/use-cases/RecoverBoards.js'

interface BoardRoutesOptions {
  boardRepo: IBoardRepository
  memberRepo: IMemberRepository
  goBackLinkRepo: IGoBackLinkRepository
}

const createBoardSchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name:       { type: 'string', minLength: 1 },
    isPrivate:  { type: 'boolean' },
    password:   { type: 'string' },
    ownerEmail: { type: 'string', format: 'email' },
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

/** Board HTTP routes: create and recover. */
export async function boardRoutes(fastify: FastifyInstance, options: BoardRoutesOptions) {
  fastify.post<{
    Body: { name: string; isPrivate?: boolean; password?: string; ownerEmail?: string }
  }>('/api/boards', { schema: { body: createBoardSchema } }, async (request, reply) => {
    const { name, isPrivate = false, password, ownerEmail } = request.body

    if (isPrivate && !password) {
      return reply.status(400).send({ error: 'Password required for private boards' })
    }

    const useCase = new CreateBoardUseCase(
      options.boardRepo,
      options.memberRepo,
      options.goBackLinkRepo,
      fastify.emailService,
    )

    const result = await useCase.execute({ name, isPrivate, password, ownerEmail })
    return reply.status(201).send(result)
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
}
