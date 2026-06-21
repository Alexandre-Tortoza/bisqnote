import { pgTable, uuid, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core'
import { boards } from './boards.js'
import { boardMembers } from './members.js'

/**
 * A calendar event scoped to a board.
 * encrypted_content: AES-256-GCM ciphertext (client-side encrypted title, description).
 * start_at/end_at are plaintext for server-side date-range queries.
 */
export const calendarEvents = pgTable('calendar_events', {
  id:                      uuid('id').primaryKey().defaultRandom(),
  board_id:                uuid('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  created_by:              uuid('created_by').references(() => boardMembers.id, { onDelete: 'set null' }),
  encrypted_content:       text('encrypted_content').notNull(), // AES-256-GCM ciphertext
  start_at:                timestamp('start_at').notNull(),
  end_at:                  timestamp('end_at'),
  notify_start_days_before: integer('notify_start_days_before').notNull().default(0),
  notify_repeat_daily:     boolean('notify_repeat_daily').notNull().default(false),
  created_at:              timestamp('created_at').notNull().defaultNow(),
  updated_at:              timestamp('updated_at').notNull().defaultNow(),
})

export type CalendarEvent = typeof calendarEvents.$inferSelect
export type NewCalendarEvent = typeof calendarEvents.$inferInsert
