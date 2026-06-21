import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core'
import { boards } from './boards.js'
import { boardMembers } from './members.js'

/**
 * An ordered column within a board's kanban view.
 * encrypted_content: AES-256-GCM ciphertext (client-side encrypted title).
 */
export const kanbanColumns = pgTable('kanban_columns', {
  id:                uuid('id').primaryKey().defaultRandom(),
  board_id:          uuid('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  position:          integer('position').notNull(),
  encrypted_content: text('encrypted_content').notNull(), // AES-256-GCM ciphertext
  created_at:        timestamp('created_at').notNull().defaultNow(),
})

/**
 * A task card within a kanban column.
 * encrypted_content: AES-256-GCM ciphertext (client-side encrypted title, description, effort, dueDate).
 */
export const kanbanTasks = pgTable('kanban_tasks', {
  id:                uuid('id').primaryKey().defaultRandom(),
  column_id:         uuid('column_id').notNull().references(() => kanbanColumns.id, { onDelete: 'cascade' }),
  board_id:          uuid('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  assigned_to:       uuid('assigned_to').references(() => boardMembers.id, { onDelete: 'set null' }),
  position:          integer('position').notNull(),
  encrypted_content: text('encrypted_content').notNull(), // AES-256-GCM ciphertext
  created_at:        timestamp('created_at').notNull().defaultNow(),
  updated_at:        timestamp('updated_at').notNull().defaultNow(),
})

export type KanbanColumn = typeof kanbanColumns.$inferSelect
export type NewKanbanColumn = typeof kanbanColumns.$inferInsert
export type KanbanTask = typeof kanbanTasks.$inferSelect
export type NewKanbanTask = typeof kanbanTasks.$inferInsert
