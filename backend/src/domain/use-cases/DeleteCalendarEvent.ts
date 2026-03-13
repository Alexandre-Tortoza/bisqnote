import { createHash } from 'node:crypto'
import { AppError } from '../errors/AppError.js'
import type { IUserRepository } from '../repositories/IUserRepository.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { ICalendarEventRepository } from '../repositories/ICalendarEventRepository.js'

/** Validates membership and deletes a calendar event that belongs to the board. */
export class DeleteCalendarEventUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly memberRepo: IMemberRepository,
    private readonly calendarRepo: ICalendarEventRepository,
  ) {}

  async execute(input: {
    userToken: string
    boardId: string
    eventId: string
  }): Promise<void> {
    const { userToken, boardId, eventId } = input

    const tokenHash = createHash('sha256').update(userToken).digest('hex')
    const user = await this.userRepo.findByTokenHash(tokenHash)
    if (!user) throw new AppError('INVALID_USER_TOKEN', 'Invalid or expired user token')

    const member = await this.memberRepo.findByUserAndBoard(user.id, boardId)
    if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

    const event = await this.calendarRepo.findById(eventId)
    if (!event || event.boardId !== boardId) {
      throw new AppError('EVENT_NOT_FOUND', 'Calendar event does not exist in this board')
    }

    await this.calendarRepo.delete(eventId)
  }
}
