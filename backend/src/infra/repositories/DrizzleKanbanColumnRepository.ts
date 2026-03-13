import { eq, max } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { IKanbanColumnRepository } from '../../domain/repositories/IKanbanColumnRepository.js'
import type { KanbanColumnEntity } from '../../domain/entities/KanbanColumn.js'
import { kanbanColumns } from '../db/schema/index.js'

/** Drizzle ORM implementation of IKanbanColumnRepository. */
export class DrizzleKanbanColumnRepository implements IKanbanColumnRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async create(data: {
    boardId: string
    title: string
    position: number
  }): Promise<KanbanColumnEntity> {
    const [row] = await this.db
      .insert(kanbanColumns)
      .values({
        board_id: data.boardId,
        position: data.position,
        encrypted_content: JSON.stringify({ title: data.title }),
      })
      .returning()

    return this.toEntity(row!)
  }

  async findByBoardId(boardId: string): Promise<KanbanColumnEntity[]> {
    const rows = await this.db
      .select()
      .from(kanbanColumns)
      .where(eq(kanbanColumns.board_id, boardId))
      .orderBy(kanbanColumns.position)

    return rows.map(this.toEntity)
  }

  async getMaxPosition(boardId: string): Promise<number> {
    const [result] = await this.db
      .select({ max: max(kanbanColumns.position) })
      .from(kanbanColumns)
      .where(eq(kanbanColumns.board_id, boardId))

    return result?.max ?? 0
  }

  async update(id: string, data: { title?: string; position?: number }): Promise<KanbanColumnEntity> {
    const existing = await this.db
      .select()
      .from(kanbanColumns)
      .where(eq(kanbanColumns.id, id))
      .then((rows) => rows[0]!)

    const currentContent = JSON.parse(existing.encrypted_content) as { title: string }

    const newContent = {
      title: data.title !== undefined ? data.title : currentContent.title,
    }

    const updateValues: Partial<typeof kanbanColumns.$inferInsert> = {
      encrypted_content: JSON.stringify(newContent),
    }
    if (data.position !== undefined) {
      updateValues.position = data.position
    }

    const [row] = await this.db
      .update(kanbanColumns)
      .set(updateValues)
      .where(eq(kanbanColumns.id, id))
      .returning()

    return this.toEntity(row!)
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(kanbanColumns).where(eq(kanbanColumns.id, id))
  }

  private toEntity(row: typeof kanbanColumns.$inferSelect): KanbanColumnEntity {
    const content = JSON.parse(row.encrypted_content) as { title: string }
    return {
      id: row.id,
      boardId: row.board_id,
      position: row.position,
      title: content.title,
      createdAt: row.created_at,
    }
  }
}
