import type { CalendarEventEntity } from '../entities/CalendarEvent.js'

/** Port for calendar event persistence — implemented by infra layer only. */
export interface ICalendarEventRepository {
  create(data: {
    boardId: string
    createdBy: string | null
    encryptedContent: string
    startAt: string
    endAt?: string | null
    notifyStartDaysBefore?: number
    notifyRepeatDaily?: boolean
  }): Promise<CalendarEventEntity>

  /** Returns all events for a board ordered by startAt ascending. */
  findByBoardId(boardId: string): Promise<CalendarEventEntity[]>

  findById(id: string): Promise<CalendarEventEntity | null>

  update(
    id: string,
    data: {
      encryptedContent?: string
      startAt?: string
      endAt?: string | null
      notifyStartDaysBefore?: number
      notifyRepeatDaily?: boolean
    },
  ): Promise<CalendarEventEntity>

  delete(id: string): Promise<void>
}
