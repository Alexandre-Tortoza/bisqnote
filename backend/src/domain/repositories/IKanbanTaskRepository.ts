import type { KanbanTaskEntity } from '../entities/KanbanTask.js'

/** Port for kanban task persistence — implemented by infra layer only. */
export interface IKanbanTaskRepository {
  create(data: {
    columnId: string
    boardId: string
    title: string
    position: number
  }): Promise<KanbanTaskEntity>

  /** Returns all tasks for a board ordered by column + position ascending. */
  findByBoardId(boardId: string): Promise<KanbanTaskEntity[]>

  /** Returns the highest position value for tasks in a column, or 0 if none. */
  getMaxPositionInColumn(columnId: string): Promise<number>

  update(
    id: string,
    data: {
      title?: string
      description?: string | null
      effort?: number | null
      dueDate?: string | null
      assignedTo?: string | null
    },
  ): Promise<KanbanTaskEntity>

  /** Moves a task to a new column at the given position, shifting other tasks as needed. */
  move(id: string, columnId: string, position: number): Promise<KanbanTaskEntity>

  delete(id: string): Promise<void>
}
