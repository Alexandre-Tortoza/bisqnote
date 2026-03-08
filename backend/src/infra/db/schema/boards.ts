import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core'

/**
 * Main board entity. All user-readable content stored in encrypted_content.
 * Public boards: plaintext JSON. Private boards: AES-256 ciphertext.
 */
export const boards = pgTable('boards', {
  id:                uuid('id').primaryKey().defaultRandom(),
  password_hash:     text('password_hash'),
  is_private:        boolean('is_private').notNull().default(false),
  encrypted_content: text('encrypted_content').notNull(), // JSON: {name}
  created_at:        timestamp('created_at').notNull().defaultNow(),
  updated_at:        timestamp('updated_at').notNull().defaultNow(),
})

export type Board = typeof boards.$inferSelect
export type NewBoard = typeof boards.$inferInsert
