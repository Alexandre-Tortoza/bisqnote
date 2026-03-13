import { createHash } from 'node:crypto'
import { AppError } from '../errors/AppError.js'
import type { IUserRepository } from '../repositories/IUserRepository.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { ICalendarEventRepository } from '../repositories/ICalendarEventRepository.js'
import type { CalendarEventEntity } from '../entities/CalendarEvent.js'

/** Validates membership and creates a new calendar event. */
export class CreateCalendarEventUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly memberRepo: IMemberRepository,
    private readonly calendarRepo: ICalendarEventRepository,
  ) {}

  async execute(input: {
    userToken: string
    boardId: string
    title: string
    startAt: string
    endAt?: string | null
    description?: string | null
    notifyStartDaysBefore?: number
    notifyRepeatDaily?: boolean
  }): Promise<CalendarEventEntity> {
    const { userToken, boardId, title, startAt } = input

    if (!title || title.length === 0) {
      throw new AppError('INVALID_INPUT', 'Event title must not be empty')
    }
    if (title.length > 200) {
      throw new AppError('INVALID_INPUT', 'Event title must not exceed 200 characters')
    }
    if (!startAt) {
      throw new AppError('INVALID_INPUT', 'Event start date is required')
    }

    const tokenHash = createHash('sha256').update(userToken).digest('hex')
    const user = await this.userRepo.findByTokenHash(tokenHash)
    if (!user) throw new AppError('INVALID_USER_TOKEN', 'Invalid or expired user token')

    const member = await this.memberRepo.findByUserAndBoard(user.id, boardId)
    if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

    return this.calendarRepo.create({
      boardId,
      createdBy: member.id,
      title,
      description: input.description ?? null,
      startAt,
      endAt: input.endAt ?? null,
      notifyStartDaysBefore: input.notifyStartDaysBefore ?? 0,
      notifyRepeatDaily: input.notifyRepeatDaily ?? false,
    })
  }
}
