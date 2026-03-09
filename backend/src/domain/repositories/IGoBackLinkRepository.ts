import type { GoBackLinkEntity } from '../entities/GoBackLink.js'

/** Port for go-back link persistence — implemented by infra layer only. */
export interface IGoBackLinkRepository {
  create(data: {
    boardId: string
    memberId: string
    token: string
    expiresAt: Date
  }): Promise<GoBackLinkEntity>

  findByToken(token: string): Promise<GoBackLinkEntity | null>

  markUsed(id: string): Promise<void>
}
