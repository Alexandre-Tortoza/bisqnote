import { hash } from 'bcryptjs'
import { AppError } from '../errors/AppError.js'
import type { IBoardRepository } from '../repositories/IBoardRepository.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { IGoBackLinkRepository } from '../repositories/IGoBackLinkRepository.js'
import type { IEmailService } from '../services/IEmailService.js'

export interface CreateBoardInput {
  name: string
  isPrivate: boolean
  password?: string
  ownerEmail?: string
  userId: string
}

export interface CreateBoardOutput {
  boardId: string
  memberToken: string
  role: 'owner'
}

/** Orchestrates board creation: hashes password, creates member, optionally sends email + go-back link. */
export class CreateBoardUseCase {
  constructor(
    private readonly boardRepo: IBoardRepository,
    private readonly memberRepo: IMemberRepository,
    private readonly goBackLinkRepo: IGoBackLinkRepository,
    private readonly emailService: IEmailService,
  ) {}

  async execute(input: CreateBoardInput): Promise<CreateBoardOutput> {
    const { name, isPrivate, password, ownerEmail, userId } = input

    if (isPrivate && !password) {
      throw new AppError('INVALID_INPUT', 'Password required for private boards')
    }

    const passwordHash = isPrivate && password ? await hash(password, 12) : null
    const encryptedContent = JSON.stringify({ name })

    const board = await this.boardRepo.create({
      isPrivate,
      passwordHash,
      ownerEmail: ownerEmail ?? null,
      encryptedContent,
    })

    const memberToken = crypto.randomUUID()
    const memberTokenHash = await hash(memberToken, 12)

    const member = await this.memberRepo.create({
      boardId: board.id,
      userId,
      tokenHash: memberTokenHash,
      role: 'owner',
      encryptedContent: JSON.stringify({}),
    })

    if (ownerEmail) {
      const goBackToken = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      await this.goBackLinkRepo.create({
        boardId: board.id,
        memberId: member.id,
        token: goBackToken,
        expiresAt,
      })

      try {
        await this.emailService.sendBoardCreated({
          to: ownerEmail,
          boardId: board.id,
          boardName: name,
          memberToken,
          goBackToken,
          appUrl: process.env['APP_URL'] ?? 'http://localhost:5173',
        })
      } catch {
        // Email delivery is a non-critical side-effect; a failure here should
        // not prevent the board from being used. The recovery link has already
        // been persisted, so the owner can still regain access via the go-back
        // link sent later or in the UI.
      }
    }

    return { boardId: board.id, memberToken, role: 'owner' }
  }
}
