import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { boards } from './boards'
import { boardMembers } from './members'

/**
 * A sticky-note style entry on the board's collaborative mural.
 */
export const muralEntries = pgTable('mural_entries', {
  id:                uuid('id').primaryKey().defaultRandom(),
  board_id:          uuid('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  created_by:        uuid('created_by').references(() => boardMembers.id, { onDelete: 'set null' }),
  encrypted_content: text('encrypted_content').notNull(), // JSON: {text, color, x, y}
  created_at:        timestamp('created_at').notNull().defaultNow(),
  updated_at:        timestamp('updated_at').notNull().defaultNow(),
})

export type MuralEntry = typeof muralEntries.$inferSelect
export type NewMuralEntry = typeof muralEntries.$inferInsert
