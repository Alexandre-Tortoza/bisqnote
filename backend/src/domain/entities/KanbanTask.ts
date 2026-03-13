/** A task card within a kanban column. */
export interface KanbanTaskEntity {
  id: string
  columnId: string
  boardId: string
  /** Member ID of the assigned member, or null if unassigned. */
  assignedTo: string | null
  position: number
  title: string
  description: string | null
  /** Effort estimate from 1 to 5, or null if not set. */
  effort: number | null
  /** ISO date string (YYYY-MM-DD), or null if no due date. */
  dueDate: string | null
  createdAt: Date
  updatedAt: Date
}
