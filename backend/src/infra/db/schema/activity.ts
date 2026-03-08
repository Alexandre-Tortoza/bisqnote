import { pgTable, pgEnum, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { boards } from './boards'
import { boardMembers } from './members'

export const activityActionEnum = pgEnum('activity_action', [
  'created', 'updated', 'deleted', 'joined', 'left',
  'moved', 'assigned', 'voted', 'uploaded',
])

export const activityTargetTypeEnum = pgEnum('activity_target_type', [
  'board', 'member', 'column', 'task', 'event',
  'message', 'mural', 'meeting', 'comment', 'poll', 'vote', 'file',
])

/**
 * Append-only audit log of all significant actions within a board.
 */
export const activityLog = pgTable('activity_log', {
  id:          uuid('id').primaryKey().defaultRandom(),
  board_id:    uuid('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  member_id:   uuid('member_id').references(() => boardMembers.id, { onDelete: 'set null' }),
  action:      activityActionEnum('action').notNull(),
  target_type: activityTargetTypeEnum('target_type').notNull(),
  target_id:   uuid('target_id').notNull(),
  meta:        text('meta'), // optional JSON: context-specific extra data
  created_at:  timestamp('created_at').notNull().defaultNow(),
})

export type ActivityLog = typeof activityLog.$inferSelect
export type NewActivityLog = typeof activityLog.$inferInsert
