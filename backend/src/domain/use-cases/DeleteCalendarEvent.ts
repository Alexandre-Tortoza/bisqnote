import { AppError } from '../errors/AppError.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { ICalendarEventRepository } from '../repositories/ICalendarEventRepository.js'

/** Validates membership and deletes a calendar event that belongs to the board. */
export class DeleteCalendarEventUseCase {
  constructor(
    private readonly memberRepo: IMemberRepository,
    private readonly calendarRepo: ICalendarEventRepository,
  ) {}

  async execute(input: {
    userId: string
    boardId: string
    eventId: string
  }): Promise<void> {
    const { userId, boardId, eventId } = input

    const member = await this.memberRepo.findByUserAndBoard(userId, boardId)
    if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

    const event = await this.calendarRepo.findById(eventId)
    if (!event || event.boardId !== boardId) {
      throw new AppError('EVENT_NOT_FOUND', 'Calendar event does not exist in this board')
    }

    await this.calendarRepo.delete(eventId)
  }
}
