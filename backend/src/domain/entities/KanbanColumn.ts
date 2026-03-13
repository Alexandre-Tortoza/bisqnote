/** A column within a board's kanban view, ordered by position. */
export interface KanbanColumnEntity {
  id: string
  boardId: string
  position: number
  title: string
  createdAt: Date
}
