import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { boards } from './boards.js'
import { boardMembers } from './members.js'

/**
 * A chat message posted by a member in a board's chat channel.
 * encrypted_content: AES-256-GCM ciphertext (client-side encrypted text).
 * The server stores and forwards opaque ciphertext — it never reads the plaintext.
 */
export const chatMessages = pgTable('chat_messages', {
  id:                uuid('id').primaryKey().defaultRandom(),
  board_id:          uuid('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  member_id:         uuid('member_id').references(() => boardMembers.id, { onDelete: 'set null' }),
  encrypted_content: text('encrypted_content').notNull(), // AES-256-GCM ciphertext
  created_at:        timestamp('created_at').notNull().defaultNow(),
})

export type ChatMessage = typeof chatMessages.$inferSelect
export type NewChatMessage = typeof chatMessages.$inferInsert
