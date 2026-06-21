import type { FastifyInstance } from 'fastify'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IGoBackLinkRepository } from '../../../domain/repositories/IGoBackLinkRepository.js'
import { RedeemGoBackLinkUseCase } from '../../../domain/use-cases/RedeemGoBackLink.js'

interface GoBackLinkRoutesOptions {
  goBackLinkRepo: IGoBackLinkRepository
  memberRepo: IMemberRepository
}

/** Go-back link HTTP routes: redeem a token for a fresh session. */
export async function goBackLinkRoutes(fastify: FastifyInstance, options: GoBackLinkRoutesOptions) {
  fastify.get<{ Params: { token: string } }>(
    '/api/go-back/:token',
    async (request, reply) => {
      const useCase = new RedeemGoBackLinkUseCase(options.memberRepo, options.goBackLinkRepo)

      try {
        const result = await useCase.execute(request.params.token)
        return reply.send(result)
      } catch {
        return reply.status(404).send({ error: 'Invalid or expired token' })
      }
    },
  )
}
