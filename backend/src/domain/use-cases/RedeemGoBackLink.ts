import { hash } from 'bcryptjs'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { IGoBackLinkRepository } from '../repositories/IGoBackLinkRepository.js'

export interface RedeemGoBackLinkOutput {
  boardId: string
  memberToken: string
  role: 'owner' | 'member'
}

/** Validates a go-back token, marks it used, regenerates member token, and returns a fresh session. */
export class RedeemGoBackLinkUseCase {
  constructor(
    private readonly memberRepo: IMemberRepository,
    private readonly goBackLinkRepo: IGoBackLinkRepository,
  ) {}

  async execute(token: string): Promise<RedeemGoBackLinkOutput> {
    const link = await this.goBackLinkRepo.findByToken(token)

    if (!link || link.usedAt !== null || link.expiresAt < new Date()) {
      throw new Error('NotFoundError: invalid or expired go-back token')
    }

    const member = await this.memberRepo.findById(link.memberId)
    if (!member) {
      throw new Error('NotFoundError: member not found')
    }

    const memberToken = crypto.randomUUID()
    const tokenHash = await hash(memberToken, 10)

    await this.memberRepo.updateTokenHash(member.id, tokenHash)
    await this.goBackLinkRepo.markUsed(link.id)

    return { boardId: link.boardId, memberToken, role: member.role }
  }
}
