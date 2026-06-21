/** A calendar event scoped to a board. */
export interface CalendarEventEntity {
  id: string
  boardId: string
  /** Member ID of the creator, or null if the member was removed. */
  createdBy: string | null
  encryptedContent: string
  /** ISO datetime string. */
  startAt: string
  /** ISO datetime string, or null if no end time. */
  endAt: string | null
  /** Number of days before startAt to begin showing in-app notifications. 0 = disabled. */
  notifyStartDaysBefore: number
  /** If true, show the notification every day within the window; if false, only on the first day. */
  notifyRepeatDaily: boolean
  createdAt: Date
  updatedAt: Date
}
