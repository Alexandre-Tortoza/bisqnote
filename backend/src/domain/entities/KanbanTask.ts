/** A task card within a kanban column. */
export interface KanbanTaskEntity {
  id: string
  columnId: string
  boardId: string
  /** Member ID of the assigned member, or null if unassigned. */
  assignedTo: string | null
  position: number
  encryptedContent: string
  createdAt: Date
  updatedAt: Date
}
