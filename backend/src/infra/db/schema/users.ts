import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * Global user accounts — one per person, shared across multiple boards.
 * Username is unique. Passwords are bcrypt-hashed.
 * token_hash is a SHA-256 hash of the active session token (rotated on each login).
 */
export const users = pgTable('users', {
  id:            uuid('id').primaryKey().defaultRandom(),
  username:      text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  token_hash:    text('token_hash'),
  created_at:    timestamp('created_at').notNull().defaultNow(),
  updated_at:    timestamp('updated_at').notNull().defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
