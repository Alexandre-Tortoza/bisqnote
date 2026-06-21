import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { IGoBackLinkRepository } from '../../domain/repositories/IGoBackLinkRepository.js'
import type { GoBackLinkEntity } from '../../domain/entities/GoBackLink.js'
import { goBackLinks } from '../db/schema/index.js'

/** Drizzle ORM implementation of IGoBackLinkRepository. */
export class DrizzleGoBackLinkRepository implements IGoBackLinkRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async create(data: {
    boardId: string
    memberId: string
    token: string
    expiresAt: Date
  }): Promise<GoBackLinkEntity> {
    const [row] = await this.db
      .insert(goBackLinks)
      .values({
        board_id: data.boardId,
        member_id: data.memberId,
        token: data.token,
        expires_at: data.expiresAt,
      })
      .returning()

    return this.toEntity(row!)
  }

  async findByToken(token: string): Promise<GoBackLinkEntity | null> {
    const [row] = await this.db.select().from(goBackLinks).where(eq(goBackLinks.token, token))
    return row ? this.toEntity(row) : null
  }

  async markUsed(id: string): Promise<void> {
    await this.db.update(goBackLinks).set({ used_at: new Date() }).where(eq(goBackLinks.id, id))
  }

  private toEntity(row: typeof goBackLinks.$inferSelect): GoBackLinkEntity {
    return {
      id: row.id,
      boardId: row.board_id,
      memberId: row.member_id ?? '',
      token: row.token,
      expiresAt: row.expires_at,
      usedAt: row.used_at,
    }
  }
}
