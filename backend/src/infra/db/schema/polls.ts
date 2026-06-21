import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { boards } from './boards.js'
import { boardMembers } from './members.js'

/**
 * A poll created within a board for members to vote on.
 */
export const polls = pgTable('polls', {
  id:                uuid('id').primaryKey().defaultRandom(),
  board_id:          uuid('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  created_by:        uuid('created_by').references(() => boardMembers.id, { onDelete: 'set null' }),
  encrypted_content: text('encrypted_content').notNull(), // JSON: {question, options[]}
  created_at:        timestamp('created_at').notNull().defaultNow(),
  updated_at:        timestamp('updated_at').notNull().defaultNow(),
})

/**
 * A single member's vote on a poll. Each member may vote at most once per poll.
 */
export const pollVotes = pgTable('poll_votes', {
  id:         uuid('id').primaryKey().defaultRandom(),
  poll_id:    uuid('poll_id').notNull().references(() => polls.id, { onDelete: 'cascade' }),
  member_id:  uuid('member_id').references(() => boardMembers.id, { onDelete: 'set null' }),
  option_index: text('option_index').notNull(), // index of the chosen option
  voted_at:   timestamp('voted_at').notNull().defaultNow(),
}, (t) => [unique().on(t.poll_id, t.member_id)])

export type Poll = typeof polls.$inferSelect
export type NewPoll = typeof polls.$inferInsert
export type PollVote = typeof pollVotes.$inferSelect
export type NewPollVote = typeof pollVotes.$inferInsert
