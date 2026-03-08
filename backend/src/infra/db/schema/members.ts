import { pgTable, pgEnum, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { boards } from './boards'

export const memberRoleEnum = pgEnum('member_role', ['owner', 'member'])

/**
 * A member identity within a board. Token-based auth — no global user accounts.
 */
export const boardMembers = pgTable('board_members', {
  id:                uuid('id').primaryKey().defaultRandom(),
  board_id:          uuid('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  token_hash:        text('token_hash').notNull(),
  role:              memberRoleEnum('role').notNull().default('member'),
  encrypted_content: text('encrypted_content').notNull(), // JSON: {displayName}
  joined_at:         timestamp('joined_at').notNull().defaultNow(),
})

/**
 * One-time tokens that let a member return to a board without re-entering a password.
 */
export const goBackLinks = pgTable('go_back_links', {
  id:         uuid('id').primaryKey().defaultRandom(),
  board_id:   uuid('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  member_id:  uuid('member_id').references(() => boardMembers.id, { onDelete: 'set null' }),
  token:      text('token').notNull().unique(),
  expires_at: timestamp('expires_at').notNull(),
  used_at:    timestamp('used_at'),
  created_at: timestamp('created_at').notNull().defaultNow(),
})

export type BoardMember = typeof boardMembers.$inferSelect
export type NewBoardMember = typeof boardMembers.$inferInsert
export type GoBackLink = typeof goBackLinks.$inferSelect
export type NewGoBackLink = typeof goBackLinks.$inferInsert
