import { AppError } from '../errors/AppError.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { IChatMessageRepository } from '../repositories/IChatMessageRepository.js'

export interface GetChatHistoryInput {
  userId: string
  boardId: string
  limit?: number
}

export interface ChatHistoryMessage {
  id: string
  memberId: string | null
  text: string
  username: string
  createdAt: Date
}

/** Returns the most recent messages for a board after verifying board membership. */
export class GetChatHistoryUseCase {
  constructor(
    private readonly memberRepo: IMemberRepository,
    private readonly chatRepo: IChatMessageRepository,
  ) {}

  async execute(input: GetChatHistoryInput): Promise<ChatHistoryMessage[]> {
    const { userId, boardId, limit = 50 } = input

    const member = await this.memberRepo.findByUserAndBoard(userId, boardId)
    if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

    const messages = await this.chatRepo.findByBoardId(boardId, limit)

    const members = await this.memberRepo.findAllByBoardId(boardId)
    const usernameByMemberId = new Map<string, string>(
      members.map((m) => [m.memberId, m.username]),
    )

    return messages.map((msg) => ({
      id: msg.id,
      memberId: msg.memberId,
      text: msg.content,
      username: msg.memberId ? (usernameByMemberId.get(msg.memberId) ?? '') : '',
      createdAt: msg.createdAt,
    }))
  }
}
