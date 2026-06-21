import { and, eq, gt, gte, lt, lte, max, ne } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { IKanbanTaskRepository } from '../../domain/repositories/IKanbanTaskRepository.js'
import type { KanbanTaskEntity } from '../../domain/entities/KanbanTask.js'
import { kanbanTasks } from '../db/schema/index.js'

/** Drizzle ORM implementation of IKanbanTaskRepository. */
export class DrizzleKanbanTaskRepository implements IKanbanTaskRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async create(data: {
    columnId: string
    boardId: string
    encryptedContent: string
    position: number
  }): Promise<KanbanTaskEntity> {
    const [row] = await this.db
      .insert(kanbanTasks)
      .values({
        column_id: data.columnId,
        board_id: data.boardId,
        position: data.position,
        encrypted_content: data.encryptedContent,
      })
      .returning()

    return this.toEntity(row!)
  }

  async findByBoardId(boardId: string): Promise<KanbanTaskEntity[]> {
    const rows = await this.db
      .select()
      .from(kanbanTasks)
      .where(eq(kanbanTasks.board_id, boardId))
      .orderBy(kanbanTasks.column_id, kanbanTasks.position)

    return rows.map(this.toEntity)
  }

  async getMaxPositionInColumn(columnId: string): Promise<number> {
    const [result] = await this.db
      .select({ max: max(kanbanTasks.position) })
      .from(kanbanTasks)
      .where(eq(kanbanTasks.column_id, columnId))

    return result?.max ?? 0
  }

  async update(
    id: string,
    data: {
      encryptedContent?: string
      assignedTo?: string | null
    },
  ): Promise<KanbanTaskEntity> {
    const updateValues: Partial<typeof kanbanTasks.$inferInsert> = {
      updated_at: new Date(),
    }
    if (data.encryptedContent !== undefined) {
      updateValues.encrypted_content = data.encryptedContent
    }
    if (data.assignedTo !== undefined) {
      updateValues.assigned_to = data.assignedTo
    }

    const [row] = await this.db
      .update(kanbanTasks)
      .set(updateValues)
      .where(eq(kanbanTasks.id, id))
      .returning()

    return this.toEntity(row!)
  }

  /**
   * Moves a task to a new column at the given position.
   * Shifts tasks in the target column to make room, and collapses the source column.
   */
  async move(id: string, columnId: string, position: number): Promise<KanbanTaskEntity> {
    const existing = await this.db
      .select()
      .from(kanbanTasks)
      .where(eq(kanbanTasks.id, id))
      .then((rows) => rows[0]!)

    const sourceColumnId = existing.column_id
    const sourcePosition = existing.position

    if (sourceColumnId === columnId) {
      // Same column: shift tasks between old and new positions
      if (sourcePosition < position) {
        // Moving down: shift intervening tasks up
        await this.db
          .update(kanbanTasks)
          .set({ position: kanbanTasks.position as unknown as number })
          .where(
            and(
              eq(kanbanTasks.column_id, columnId),
              ne(kanbanTasks.id, id),
              gt(kanbanTasks.position, sourcePosition),
              lte(kanbanTasks.position, position),
            ),
          )
        // Use raw SQL-style decrement
        const rows = await this.db
          .select()
          .from(kanbanTasks)
          .where(
            and(
              eq(kanbanTasks.column_id, columnId),
              ne(kanbanTasks.id, id),
              gt(kanbanTasks.position, sourcePosition),
              lte(kanbanTasks.position, position),
            ),
          )
        for (const row of rows) {
          await this.db
            .update(kanbanTasks)
            .set({ position: row.position - 1 })
            .where(eq(kanbanTasks.id, row.id))
        }
      } else if (sourcePosition > position) {
        // Moving up: shift intervening tasks down
        const rows = await this.db
          .select()
          .from(kanbanTasks)
          .where(
            and(
              eq(kanbanTasks.column_id, columnId),
              ne(kanbanTasks.id, id),
              gte(kanbanTasks.position, position),
              lt(kanbanTasks.position, sourcePosition),
            ),
          )
        for (const row of rows) {
          await this.db
            .update(kanbanTasks)
            .set({ position: row.position + 1 })
            .where(eq(kanbanTasks.id, row.id))
        }
      }
    } else {
      // Different columns: collapse source, make room in target
      const sourceRows = await this.db
        .select()
        .from(kanbanTasks)
        .where(and(eq(kanbanTasks.column_id, sourceColumnId), gt(kanbanTasks.position, sourcePosition)))
      for (const row of sourceRows) {
        await this.db
          .update(kanbanTasks)
          .set({ position: row.position - 1 })
          .where(eq(kanbanTasks.id, row.id))
      }

      const targetRows = await this.db
        .select()
        .from(kanbanTasks)
        .where(and(eq(kanbanTasks.column_id, columnId), gte(kanbanTasks.position, position)))
      for (const row of targetRows) {
        await this.db
          .update(kanbanTasks)
          .set({ position: row.position + 1 })
          .where(eq(kanbanTasks.id, row.id))
      }
    }

    const [row] = await this.db
      .update(kanbanTasks)
      .set({ column_id: columnId, position, updated_at: new Date() })
      .where(eq(kanbanTasks.id, id))
      .returning()

    return this.toEntity(row!)
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(kanbanTasks).where(eq(kanbanTasks.id, id))
  }

  private toEntity(row: typeof kanbanTasks.$inferSelect): KanbanTaskEntity {
    return {
      id: row.id,
      columnId: row.column_id,
      boardId: row.board_id,
      assignedTo: row.assigned_to,
      position: row.position,
      encryptedContent: row.encrypted_content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}
