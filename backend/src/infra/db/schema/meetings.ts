import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { boards } from './boards'
import { boardMembers } from './members'

/**
 * Meeting notes document collaboratively written within a board.
 */
export const meetingNotes = pgTable('meeting_notes', {
  id:                uuid('id').primaryKey().defaultRandom(),
  board_id:          uuid('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  created_by:        uuid('created_by').references(() => boardMembers.id, { onDelete: 'set null' }),
  encrypted_content: text('encrypted_content').notNull(), // JSON: {title, body, meetingAt}
  created_at:        timestamp('created_at').notNull().defaultNow(),
  updated_at:        timestamp('updated_at').notNull().defaultNow(),
})

export type MeetingNote = typeof meetingNotes.$inferSelect
export type NewMeetingNote = typeof meetingNotes.$inferInsert
