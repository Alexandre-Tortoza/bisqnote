import { pgTable, pgEnum, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { boards } from './boards'
import { boardMembers } from './members'

export const fileTargetTypeEnum = pgEnum('file_target_type', ['task', 'mural', 'meeting', 'chat'])

/**
 * A file attachment linked to a task, mural entry, meeting note, or chat message.
 */
export const fileAttachments = pgTable('file_attachments', {
  id:                uuid('id').primaryKey().defaultRandom(),
  board_id:          uuid('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  uploaded_by:       uuid('uploaded_by').references(() => boardMembers.id, { onDelete: 'set null' }),
  target_type:       fileTargetTypeEnum('target_type').notNull(),
  target_id:         uuid('target_id').notNull(),
  encrypted_content: text('encrypted_content').notNull(), // JSON: {filename, mimeType, sizeBytes, storageKey}
  created_at:        timestamp('created_at').notNull().defaultNow(),
})

export type FileAttachment = typeof fileAttachments.$inferSelect
export type NewFileAttachment = typeof fileAttachments.$inferInsert
