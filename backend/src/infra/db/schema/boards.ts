import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core'

/**
 * Main board entity.
 * encrypted_content: plaintext JSON (board name) — the board name is sent
 * unencrypted because the encryption key depends on the boardId generated
 * by the server at creation time.
 */
export const boards = pgTable('boards', {
  id:                uuid('id').primaryKey().defaultRandom(),
  password_hash:     text('password_hash'),
  is_private:        boolean('is_private').notNull().default(false),
  owner_email:       text('owner_email'),
  encrypted_content: text('encrypted_content').notNull(), // JSON: {name}
  created_at:        timestamp('created_at').notNull().defaultNow(),
  updated_at:        timestamp('updated_at').notNull().defaultNow(),
})

export type Board = typeof boards.$inferSelect
export type NewBoard = typeof boards.$inferInsert
