import { and, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { IMemberRepository } from '../../domain/repositories/IMemberRepository.js'
import type { BoardMemberEntity } from '../../domain/entities/BoardMember.js'
import { boardMembers } from '../db/schema/index.js'

/** Drizzle ORM implementation of IMemberRepository. */
export class DrizzleMemberRepository implements IMemberRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async create(data: {
    boardId: string
    userId?: string | null
    tokenHash: string
    role: 'owner' | 'member'
    encryptedContent: string
  }): Promise<BoardMemberEntity> {
    const [row] = await this.db
      .insert(boardMembers)
      .values({
        board_id: data.boardId,
        user_id: data.userId ?? null,
        token_hash: data.tokenHash,
        role: data.role,
        encrypted_content: data.encryptedContent,
      })
      .returning()

    return this.toEntity(row!)
  }

  async findById(id: string): Promise<BoardMemberEntity | null> {
    const [row] = await this.db.select().from(boardMembers).where(eq(boardMembers.id, id))
    return row ? this.toEntity(row) : null
  }

  async findByUserAndBoard(userId: string, boardId: string): Promise<BoardMemberEntity | null> {
    const [row] = await this.db
      .select()
      .from(boardMembers)
      .where(and(eq(boardMembers.user_id, userId), eq(boardMembers.board_id, boardId)))
    return row ? this.toEntity(row) : null
  }

  async updateTokenHash(id: string, tokenHash: string): Promise<void> {
    await this.db.update(boardMembers).set({ token_hash: tokenHash }).where(eq(boardMembers.id, id))
  }

  private toEntity(row: typeof boardMembers.$inferSelect): BoardMemberEntity {
    return {
      id: row.id,
      boardId: row.board_id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      role: row.role,
      encryptedContent: row.encrypted_content,
    }
  }
}
