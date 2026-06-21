import { pgTable, pgEnum, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { boards } from './boards.js'
import { boardMembers } from './members.js'

export const boardFileTypeEnum = pgEnum('board_file_type', ['file', 'link'])

/**
 * A standalone file upload or external link shared directly on a board.
 * For type='file': encrypted_content JSON = { name, mimeType, sizeBytes, storageKey }
 * For type='link': encrypted_content JSON = { name, url }
 */
export const boardFiles = pgTable('board_files', {
  id:                uuid('id').primaryKey().defaultRandom(),
  board_id:          uuid('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  uploaded_by:       uuid('uploaded_by').references(() => boardMembers.id, { onDelete: 'set null' }),
  type:              boardFileTypeEnum('type').notNull(),
  encrypted_content: text('encrypted_content').notNull(),
  created_at:        timestamp('created_at').notNull().defaultNow(),
})

export type BoardFile = typeof boardFiles.$inferSelect
export type NewBoardFile = typeof boardFiles.$inferInsert
