import { createHash } from 'node:crypto'
import { AppError } from '../errors/AppError.js'
import type { IUserRepository } from '../repositories/IUserRepository.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { IChatMessageRepository } from '../repositories/IChatMessageRepository.js'

export interface GetChatHistoryInput {
  userToken: string
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
    private readonly userRepo: IUserRepository,
    private readonly memberRepo: IMemberRepository,
    private readonly chatRepo: IChatMessageRepository,
  ) {}

  async execute(input: GetChatHistoryInput): Promise<ChatHistoryMessage[]> {
    const { userToken, boardId, limit = 50 } = input

    const tokenHash = createHash('sha256').update(userToken).digest('hex')
    const user = await this.userRepo.findByTokenHash(tokenHash)
    if (!user) throw new AppError('INVALID_USER_TOKEN', 'Invalid or expired user token')

    const member = await this.memberRepo.findByUserAndBoard(user.id, boardId)
    if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

    const messages = await this.chatRepo.findByBoardId(boardId, limit)

    return messages.map((msg) => {
      const parsed = JSON.parse(msg.content) as { text: string; username: string }
      return {
        id: msg.id,
        memberId: msg.memberId,
        text: parsed.text,
        username: parsed.username,
        createdAt: msg.createdAt,
      }
    })
  }
}
