import { eq, desc } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { IBoardFileRepository } from '../../domain/repositories/IBoardFileRepository.js'
import type { BoardFileEntity } from '../../domain/entities/BoardFile.js'
import { boardFiles } from '../db/schema/index.js'

interface FileContent {
  name: string
  url: string | null
  mimeType: string | null
  sizeBytes: number | null
  storageKey: string | null
}

/** Drizzle ORM implementation of IBoardFileRepository. */
export class DrizzleBoardFileRepository implements IBoardFileRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async createLink(data: {
    boardId: string
    uploadedBy: string | null
    name: string
    url: string
  }): Promise<BoardFileEntity> {
    const [row] = await this.db
      .insert(boardFiles)
      .values({
        board_id: data.boardId,
        uploaded_by: data.uploadedBy,
        type: 'link',
        encrypted_content: JSON.stringify({
          name: data.name,
          url: data.url,
          mimeType: null,
          sizeBytes: null,
          storageKey: null,
        }),
      })
      .returning()

    return this.toEntity(row!)
  }

  async createFile(data: {
    boardId: string
    uploadedBy: string | null
    name: string
    mimeType: string
    sizeBytes: number
    storageKey: string
  }): Promise<BoardFileEntity> {
    const [row] = await this.db
      .insert(boardFiles)
      .values({
        board_id: data.boardId,
        uploaded_by: data.uploadedBy,
        type: 'file',
        encrypted_content: JSON.stringify({
          name: data.name,
          url: null,
          mimeType: data.mimeType,
          sizeBytes: data.sizeBytes,
          storageKey: data.storageKey,
        }),
      })
      .returning()

    return this.toEntity(row!)
  }

  async findByBoardId(boardId: string): Promise<BoardFileEntity[]> {
    const rows = await this.db
      .select()
      .from(boardFiles)
      .where(eq(boardFiles.board_id, boardId))
      .orderBy(desc(boardFiles.created_at))

    return rows.map((r) => this.toEntity(r))
  }

  async findById(id: string): Promise<BoardFileEntity | null> {
    const rows = await this.db.select().from(boardFiles).where(eq(boardFiles.id, id))
    return rows[0] ? this.toEntity(rows[0]) : null
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(boardFiles).where(eq(boardFiles.id, id))
  }

  private toEntity(row: typeof boardFiles.$inferSelect): BoardFileEntity {
    const content = JSON.parse(row.encrypted_content) as FileContent
    return {
      id: row.id,
      boardId: row.board_id,
      uploadedBy: row.uploaded_by,
      type: row.type,
      name: content.name,
      url: content.url,
      mimeType: content.mimeType,
      sizeBytes: content.sizeBytes,
      storageKey: content.storageKey,
      createdAt: row.created_at,
    }
  }
}
