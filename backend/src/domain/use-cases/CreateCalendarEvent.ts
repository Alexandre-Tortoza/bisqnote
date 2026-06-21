import { AppError } from '../errors/AppError.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { ICalendarEventRepository } from '../repositories/ICalendarEventRepository.js'
import type { CalendarEventEntity } from '../entities/CalendarEvent.js'

/** Validates membership and creates a new calendar event. */
export class CreateCalendarEventUseCase {
  constructor(
    private readonly memberRepo: IMemberRepository,
    private readonly calendarRepo: ICalendarEventRepository,
  ) {}

  async execute(input: {
    userId: string
    boardId: string
    encryptedContent: string
    startAt: string
    endAt?: string | null
    notifyStartDaysBefore?: number
    notifyRepeatDaily?: boolean
  }): Promise<CalendarEventEntity> {
    const { userId, boardId, encryptedContent, startAt } = input

    if (!startAt) {
      throw new AppError('INVALID_INPUT', 'Event start date is required')
    }

    const member = await this.memberRepo.findByUserAndBoard(userId, boardId)
    if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

    return this.calendarRepo.create({
      boardId,
      createdBy: member.id,
      encryptedContent,
      startAt,
      endAt: input.endAt ?? null,
      notifyStartDaysBefore: input.notifyStartDaysBefore ?? 0,
      notifyRepeatDaily: input.notifyRepeatDaily ?? false,
    })
  }
}
