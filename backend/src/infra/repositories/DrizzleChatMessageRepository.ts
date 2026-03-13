import { desc, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { chatMessages } from '../db/schema/index.js'
import type { IChatMessageRepository } from '../../domain/repositories/IChatMessageRepository.js'
import type { ChatMessageEntity } from '../../domain/entities/ChatMessage.js'

/** Drizzle ORM implementation of IChatMessageRepository. */
export class DrizzleChatMessageRepository implements IChatMessageRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async create(data: Omit<ChatMessageEntity, 'id' | 'createdAt'>): Promise<ChatMessageEntity> {
    const [row] = await this.db
      .insert(chatMessages)
      .values({
        board_id: data.boardId,
        member_id: data.memberId ?? undefined,
        encrypted_content: data.content,
      })
      .returning()

    return this.toEntity(row!)
  }

  async findByBoardId(boardId: string, limit: number): Promise<ChatMessageEntity[]> {
    // Fetch the last `limit` messages ordered newest-first, then reverse to get oldest-first.
    const rows = await this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.board_id, boardId))
      .orderBy(desc(chatMessages.created_at))
      .limit(limit)

    return rows.reverse().map((row) => this.toEntity(row))
  }

  private toEntity(row: typeof chatMessages.$inferSelect): ChatMessageEntity {
    return {
      id: row.id,
      boardId: row.board_id,
      memberId: row.member_id ?? null,
      content: row.encrypted_content,
      createdAt: row.created_at,
    }
  }
}
