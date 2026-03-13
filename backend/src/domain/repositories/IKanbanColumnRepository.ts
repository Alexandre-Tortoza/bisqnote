import type { KanbanColumnEntity } from '../entities/KanbanColumn.js'

/** Port for kanban column persistence — implemented by infra layer only. */
export interface IKanbanColumnRepository {
  create(data: {
    boardId: string
    title: string
    position: number
  }): Promise<KanbanColumnEntity>

  /** Returns all columns for a board ordered by position ascending. */
  findByBoardId(boardId: string): Promise<KanbanColumnEntity[]>

  /** Returns the highest position value for columns in a board, or 0 if none. */
  getMaxPosition(boardId: string): Promise<number>

  update(id: string, data: { title?: string; position?: number }): Promise<KanbanColumnEntity>

  delete(id: string): Promise<void>
}
