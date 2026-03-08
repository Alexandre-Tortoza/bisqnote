import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { boards } from './boards'
import { boardMembers } from './members'

/**
 * A chat message posted by a member in a board's chat channel.
 */
export const chatMessages = pgTable('chat_messages', {
  id:                uuid('id').primaryKey().defaultRandom(),
  board_id:          uuid('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  member_id:         uuid('member_id').references(() => boardMembers.id, { onDelete: 'set null' }),
  encrypted_content: text('encrypted_content').notNull(), // JSON: {text}
  created_at:        timestamp('created_at').notNull().defaultNow(),
})

export type ChatMessage = typeof chatMessages.$inferSelect
export type NewChatMessage = typeof chatMessages.$inferInsert
