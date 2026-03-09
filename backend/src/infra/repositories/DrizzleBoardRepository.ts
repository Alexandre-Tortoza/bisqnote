import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { IBoardRepository } from '../../domain/repositories/IBoardRepository.js'
import type { BoardEntity } from '../../domain/entities/Board.js'
import { boards } from '../db/schema/index.js'

/** Drizzle ORM implementation of IBoardRepository. */
export class DrizzleBoardRepository implements IBoardRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async create(data: {
    isPrivate: boolean
    passwordHash: string | null
    ownerEmail: string | null
    encryptedContent: string
  }): Promise<BoardEntity> {
    const [row] = await this.db
      .insert(boards)
      .values({
        is_private: data.isPrivate,
        password_hash: data.passwordHash,
        owner_email: data.ownerEmail,
        encrypted_content: data.encryptedContent,
      })
      .returning()

    return this.toEntity(row!)
  }

  async findByOwnerEmail(email: string): Promise<BoardEntity[]> {
    const rows = await this.db.select().from(boards).where(eq(boards.owner_email, email))
    return rows.map((row) => this.toEntity(row))
  }

  private toEntity(row: typeof boards.$inferSelect): BoardEntity {
    return {
      id: row.id,
      isPrivate: row.is_private,
      passwordHash: row.password_hash,
      ownerEmail: row.owner_email,
      encryptedContent: row.encrypted_content,
      createdAt: row.created_at,
    }
  }
}
