import { compare, hash } from 'bcryptjs'
import { AppError } from '../errors/AppError.js'
import type { IBoardRepository } from '../repositories/IBoardRepository.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'

export interface JoinBoardInput {
  boardId: string
  password?: string
  userId: string
}

export interface JoinBoardOutput {
  boardId: string
  memberToken: string
  role: 'owner' | 'member'
}

/** Validates board access and user identity, then creates or restores a member session. */
export class JoinBoardUseCase {
  constructor(
    private readonly boardRepo: IBoardRepository,
    private readonly memberRepo: IMemberRepository,
  ) {}

  async execute(input: JoinBoardInput): Promise<JoinBoardOutput> {
    const { boardId, password, userId } = input

    const board = await this.boardRepo.findById(boardId)
    if (!board) throw new AppError('BOARD_NOT_FOUND', 'Board not found')

    if (board.isPrivate) {
      if (!password) throw new AppError('PASSWORD_REQUIRED', 'Password required')
      const valid = await compare(password, board.passwordHash!)
      if (!valid) throw new AppError('INVALID_PASSWORD', 'Invalid password')
    }

    const memberToken = crypto.randomUUID()
    const memberTokenHash = await hash(memberToken, 12)

    const existing = await this.memberRepo.findByUserAndBoard(userId, boardId)

    if (existing) {
      await this.memberRepo.updateTokenHash(existing.id, memberTokenHash)
      return { boardId: board.id, memberToken, role: existing.role }
    }

    await this.memberRepo.create({
      boardId: board.id,
      userId,
      tokenHash: memberTokenHash,
      role: 'member',
      encryptedContent: JSON.stringify({}),
    })

    return { boardId: board.id, memberToken, role: 'member' }
  }
}
