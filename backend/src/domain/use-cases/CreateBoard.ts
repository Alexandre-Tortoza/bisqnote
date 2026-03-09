import { createHash } from 'node:crypto'
import { hash } from 'bcryptjs'
import { AppError } from '../errors/AppError.js'
import type { IBoardRepository } from '../repositories/IBoardRepository.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { IGoBackLinkRepository } from '../repositories/IGoBackLinkRepository.js'
import type { IEmailService } from '../services/IEmailService.js'
import type { IUserRepository } from '../repositories/IUserRepository.js'

export interface CreateBoardInput {
  name: string
  isPrivate: boolean
  password?: string
  ownerEmail?: string
  userToken: string
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
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(input: CreateBoardInput): Promise<CreateBoardOutput> {
    const { name, isPrivate, password, ownerEmail, userToken } = input

    if (isPrivate && !password) {
      throw new AppError('INVALID_INPUT', 'Password required for private boards')
    }

    const tokenHash = createHash('sha256').update(userToken).digest('hex')
    const user = await this.userRepo.findByTokenHash(tokenHash)
    if (!user) throw new AppError('INVALID_USER_TOKEN', 'Invalid or expired user token')

    const passwordHash = isPrivate && password ? await hash(password, 10) : null
    const encryptedContent = JSON.stringify({ name })

    const board = await this.boardRepo.create({
      isPrivate,
      passwordHash,
      ownerEmail: ownerEmail ?? null,
      encryptedContent,
    })

    const memberToken = crypto.randomUUID()
    const memberTokenHash = await hash(memberToken, 10)

    const member = await this.memberRepo.create({
      boardId: board.id,
      userId: user.id,
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

      await this.emailService.sendBoardCreated({
        to: ownerEmail,
        boardId: board.id,
        boardName: name,
        memberToken,
        goBackToken,
        appUrl: process.env['APP_URL'] ?? 'http://localhost:5173',
      })
    }

    return { boardId: board.id, memberToken, role: 'owner' }
  }
}
