import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { ICalendarEventRepository } from '../../domain/repositories/ICalendarEventRepository.js'
import type { CalendarEventEntity } from '../../domain/entities/CalendarEvent.js'
import { calendarEvents } from '../db/schema/index.js'

interface EventContent {
  title: string
  description: string | null
  startAt: string
  endAt: string | null
  notifyStartDaysBefore: number
  notifyRepeatDaily: boolean
}

/** Drizzle ORM implementation of ICalendarEventRepository. */
export class DrizzleCalendarEventRepository implements ICalendarEventRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async create(data: {
    boardId: string
    createdBy: string | null
    title: string
    description?: string | null
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
        encrypted_content: JSON.stringify({
          title: data.title,
          description: data.description ?? null,
          startAt: data.startAt,
          endAt: data.endAt ?? null,
          notifyStartDaysBefore: data.notifyStartDaysBefore ?? 0,
          notifyRepeatDaily: data.notifyRepeatDaily ?? false,
        }),
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
      title?: string
      description?: string | null
      startAt?: string
      endAt?: string | null
      notifyStartDaysBefore?: number
      notifyRepeatDaily?: boolean
    },
  ): Promise<CalendarEventEntity> {
    const existing = await this.db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, id))
      .then((rows) => rows[0]!)

    const current = JSON.parse(existing.encrypted_content) as EventContent

    const newContent: EventContent = {
      title: data.title !== undefined ? data.title : current.title,
      description: data.description !== undefined ? data.description : current.description,
      startAt: data.startAt !== undefined ? data.startAt : current.startAt,
      endAt: data.endAt !== undefined ? data.endAt : current.endAt,
      notifyStartDaysBefore:
        data.notifyStartDaysBefore !== undefined ? data.notifyStartDaysBefore : current.notifyStartDaysBefore,
      notifyRepeatDaily:
        data.notifyRepeatDaily !== undefined ? data.notifyRepeatDaily : current.notifyRepeatDaily,
    }

    const [row] = await this.db
      .update(calendarEvents)
      .set({ encrypted_content: JSON.stringify(newContent), updated_at: new Date() })
      .where(eq(calendarEvents.id, id))
      .returning()

    return this.toEntity(row!)
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(calendarEvents).where(eq(calendarEvents.id, id))
  }

  private toEntity(row: typeof calendarEvents.$inferSelect): CalendarEventEntity {
    const content = JSON.parse(row.encrypted_content) as EventContent
    return {
      id: row.id,
      boardId: row.board_id,
      createdBy: row.created_by,
      title: content.title,
      description: content.description,
      startAt: content.startAt,
      endAt: content.endAt,
      notifyStartDaysBefore: content.notifyStartDaysBefore,
      notifyRepeatDaily: content.notifyRepeatDaily,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}
