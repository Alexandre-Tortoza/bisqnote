import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core'
import { boards } from './boards'
import { boardMembers } from './members'

/**
 * An ordered column within a board's kanban view.
 */
export const kanbanColumns = pgTable('kanban_columns', {
  id:                uuid('id').primaryKey().defaultRandom(),
  board_id:          uuid('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  position:          integer('position').notNull(),
  encrypted_content: text('encrypted_content').notNull(), // JSON: {title}
  created_at:        timestamp('created_at').notNull().defaultNow(),
})

/**
 * A task card within a kanban column.
 */
export const kanbanTasks = pgTable('kanban_tasks', {
  id:                uuid('id').primaryKey().defaultRandom(),
  column_id:         uuid('column_id').notNull().references(() => kanbanColumns.id, { onDelete: 'cascade' }),
  board_id:          uuid('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  assigned_to:       uuid('assigned_to').references(() => boardMembers.id, { onDelete: 'set null' }),
  position:          integer('position').notNull(),
  encrypted_content: text('encrypted_content').notNull(), // JSON: {title, description, effort, dueDate}
  created_at:        timestamp('created_at').notNull().defaultNow(),
  updated_at:        timestamp('updated_at').notNull().defaultNow(),
})

export type KanbanColumn = typeof kanbanColumns.$inferSelect
export type NewKanbanColumn = typeof kanbanColumns.$inferInsert
export type KanbanTask = typeof kanbanTasks.$inferSelect
export type NewKanbanTask = typeof kanbanTasks.$inferInsert
