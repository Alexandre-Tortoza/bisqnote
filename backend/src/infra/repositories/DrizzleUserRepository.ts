import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js'
import type { UserEntity } from '../../domain/entities/User.js'
import { users } from '../db/schema/index.js'

/** Drizzle ORM implementation of IUserRepository. */
export class DrizzleUserRepository implements IUserRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async create(data: {
    username: string
    passwordHash: string
    tokenHash: string
  }): Promise<UserEntity> {
    const [row] = await this.db
      .insert(users)
      .values({
        username: data.username,
        password_hash: data.passwordHash,
        token_hash: data.tokenHash,
      })
      .returning()

    return this.toEntity(row!)
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    const [row] = await this.db.select().from(users).where(eq(users.username, username))
    return row ? this.toEntity(row) : null
  }

  async findByTokenHash(tokenHash: string): Promise<UserEntity | null> {
    const [row] = await this.db.select().from(users).where(eq(users.token_hash, tokenHash))
    return row ? this.toEntity(row) : null
  }

  async updateTokenHash(id: string, tokenHash: string): Promise<void> {
    await this.db.update(users).set({ token_hash: tokenHash, updated_at: new Date() }).where(eq(users.id, id))
  }

  private toEntity(row: typeof users.$inferSelect): UserEntity {
    return {
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      tokenHash: row.token_hash,
      createdAt: row.created_at,
    }
  }
}
