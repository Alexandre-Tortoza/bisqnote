import { pgTable, pgEnum, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { boards } from './boards.js'
import { boardMembers } from './members.js'

export const commentTargetTypeEnum = pgEnum('comment_target_type', ['task', 'event', 'mural', 'meeting'])

/**
 * A comment attached to a task, calendar event, mural entry, or meeting note.
 */
export const comments = pgTable('comments', {
  id:                uuid('id').primaryKey().defaultRandom(),
  board_id:          uuid('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  member_id:         uuid('member_id').references(() => boardMembers.id, { onDelete: 'set null' }),
  target_type:       commentTargetTypeEnum('target_type').notNull(),
  target_id:         uuid('target_id').notNull(),
  encrypted_content: text('encrypted_content').notNull(), // JSON: {text}
  created_at:        timestamp('created_at').notNull().defaultNow(),
  updated_at:        timestamp('updated_at').notNull().defaultNow(),
})

export type Comment = typeof comments.$inferSelect
export type NewComment = typeof comments.$inferInsert
