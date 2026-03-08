import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { boards } from './boards'
import { boardMembers } from './members'

/**
 * A calendar event scoped to a board.
 */
export const calendarEvents = pgTable('calendar_events', {
  id:                uuid('id').primaryKey().defaultRandom(),
  board_id:          uuid('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  created_by:        uuid('created_by').references(() => boardMembers.id, { onDelete: 'set null' }),
  encrypted_content: text('encrypted_content').notNull(), // JSON: {title, description, startAt, endAt}
  created_at:        timestamp('created_at').notNull().defaultNow(),
  updated_at:        timestamp('updated_at').notNull().defaultNow(),
})

export type CalendarEvent = typeof calendarEvents.$inferSelect
export type NewCalendarEvent = typeof calendarEvents.$inferInsert
