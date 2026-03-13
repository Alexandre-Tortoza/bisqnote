import { createHash } from 'node:crypto'
import { AppError } from '../errors/AppError.js'
import type { IUserRepository } from '../repositories/IUserRepository.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { ICalendarEventRepository } from '../repositories/ICalendarEventRepository.js'
import type { CalendarEventEntity } from '../entities/CalendarEvent.js'

/** Validates auth and membership, then returns all calendar events for the board. */
export class GetCalendarEventsUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly memberRepo: IMemberRepository,
    private readonly calendarRepo: ICalendarEventRepository,
  ) {}

  async execute(input: { userToken: string; boardId: string }): Promise<CalendarEventEntity[]> {
    const { userToken, boardId } = input

    const tokenHash = createHash('sha256').update(userToken).digest('hex')
    const user = await this.userRepo.findByTokenHash(tokenHash)
    if (!user) throw new AppError('INVALID_USER_TOKEN', 'Invalid or expired user token')

    const member = await this.memberRepo.findByUserAndBoard(user.id, boardId)
    if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

    return this.calendarRepo.findByBoardId(boardId)
  }
}
