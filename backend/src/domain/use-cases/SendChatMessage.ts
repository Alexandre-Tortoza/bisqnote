import { createHash } from 'node:crypto'
import { AppError } from '../errors/AppError.js'
import type { IUserRepository } from '../repositories/IUserRepository.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { IChatMessageRepository } from '../repositories/IChatMessageRepository.js'

export interface SendChatMessageInput {
  userToken: string
  boardId: string
  text: string
}

export interface SendChatMessageOutput {
  id: string
  boardId: string
  memberId: string | null
  text: string
  username: string
  createdAt: Date
}

/** Validates board membership and persists a chat message. */
export class SendChatMessageUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly memberRepo: IMemberRepository,
    private readonly chatRepo: IChatMessageRepository,
  ) {}

  async execute(input: SendChatMessageInput): Promise<SendChatMessageOutput> {
    const { userToken, boardId, text } = input

    if (!text || text.length === 0) {
      throw new AppError('INVALID_INPUT', 'Message text must not be empty')
    }
    if (text.length > 2000) {
      throw new AppError('INVALID_INPUT', 'Message text must not exceed 2000 characters')
    }

    const tokenHash = createHash('sha256').update(userToken).digest('hex')
    const user = await this.userRepo.findByTokenHash(tokenHash)
    if (!user) throw new AppError('INVALID_USER_TOKEN', 'Invalid or expired user token')

    const member = await this.memberRepo.findByUserAndBoard(user.id, boardId)
    if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

    const content = JSON.stringify({ text, username: user.username })
    const saved = await this.chatRepo.create({ boardId, memberId: member.id, content })

    return {
      id: saved.id,
      boardId: saved.boardId,
      memberId: saved.memberId,
      text,
      username: user.username,
      createdAt: saved.createdAt,
    }
  }
}
