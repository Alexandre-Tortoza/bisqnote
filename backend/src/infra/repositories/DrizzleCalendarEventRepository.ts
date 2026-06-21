import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { ICalendarEventRepository } from '../../domain/repositories/ICalendarEventRepository.js'
import type { CalendarEventEntity } from '../../domain/entities/CalendarEvent.js'
import { calendarEvents } from '../db/schema/index.js'

/** Drizzle ORM implementation of ICalendarEventRepository. */
export class DrizzleCalendarEventRepository implements ICalendarEventRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async create(data: {
    boardId: string
    createdBy: string | null
    encryptedContent: string
    startAt: string
    endAt?: string | null
    notifyStartDaysBefore?: number
    notifyRepeatDaily?: boolean
  }): Promise<CalendarEventEntity> {
    const [row] = await this.db
      .insert(calendarEvents)
      .values({
        board_id: data.boardId,
        created_by: data.createdBy,
        encrypted_content: data.encryptedContent,
        start_at: new Date(data.startAt),
        end_at: data.endAt ? new Date(data.endAt) : null,
        notify_start_days_before: data.notifyStartDaysBefore ?? 0,
        notify_repeat_daily: data.notifyRepeatDaily ?? false,
      })
      .returning()

    return this.toEntity(row!)
  }

  async findByBoardId(boardId: string): Promise<CalendarEventEntity[]> {
    const rows = await this.db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.board_id, boardId))
      .orderBy(calendarEvents.created_at)

    return rows.map((r) => this.toEntity(r))
  }

  async findById(id: string): Promise<CalendarEventEntity | null> {
    const rows = await this.db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, id))

    return rows[0] ? this.toEntity(rows[0]) : null
  }

  async update(
    id: string,
    data: {
      encryptedContent?: string
      startAt?: string
      endAt?: string | null
      notifyStartDaysBefore?: number
      notifyRepeatDaily?: boolean
    },
  ): Promise<CalendarEventEntity> {
    const updateValues: Partial<typeof calendarEvents.$inferInsert> = {
      updated_at: new Date(),
    }
    if (data.encryptedContent !== undefined) {
      updateValues.encrypted_content = data.encryptedContent
    }
    if (data.startAt !== undefined) {
      updateValues.start_at = new Date(data.startAt)
    }
    if (data.endAt !== undefined) {
      updateValues.end_at = data.endAt ? new Date(data.endAt) : null
    }
    if (data.notifyStartDaysBefore !== undefined) {
      updateValues.notify_start_days_before = data.notifyStartDaysBefore
    }
    if (data.notifyRepeatDaily !== undefined) {
      updateValues.notify_repeat_daily = data.notifyRepeatDaily
    }

    const [row] = await this.db
      .update(calendarEvents)
      .set(updateValues)
      .where(eq(calendarEvents.id, id))
      .returning()

    return this.toEntity(row!)
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(calendarEvents).where(eq(calendarEvents.id, id))
  }

  private toEntity(row: typeof calendarEvents.$inferSelect): CalendarEventEntity {
    return {
      id: row.id,
      boardId: row.board_id,
      createdBy: row.created_by,
      encryptedContent: row.encrypted_content,
      startAt: row.start_at.toISOString(),
      endAt: row.end_at ? row.end_at.toISOString() : null,
      notifyStartDaysBefore: row.notify_start_days_before,
      notifyRepeatDaily: row.notify_repeat_daily,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}
