import { AppError } from '../errors/AppError.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { IChatMessageRepository } from '../repositories/IChatMessageRepository.js'

export interface SendChatMessageInput {
  userId: string
  boardId: string
  text: string
  username: string
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
    private readonly memberRepo: IMemberRepository,
    private readonly chatRepo: IChatMessageRepository,
  ) {}

  async execute(input: SendChatMessageInput): Promise<SendChatMessageOutput> {
    const { userId, boardId, text, username } = input

    if (!text || text.length === 0) {
      throw new AppError('INVALID_INPUT', 'Message text must not be empty')
    }
    if (text.length > 2000) {
      throw new AppError('INVALID_INPUT', 'Message text must not exceed 2000 characters')
    }

    const member = await this.memberRepo.findByUserAndBoard(userId, boardId)
    if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

    const saved = await this.chatRepo.create({ boardId, memberId: member.id, content: text })

    return {
      id: saved.id,
      boardId: saved.boardId,
      memberId: saved.memberId,
      text,
      username,
      createdAt: saved.createdAt,
    }
  }
}
