import type { ChatMessageEntity } from '../entities/ChatMessage.js'

/** Port for persisting and retrieving board chat messages. */
export interface IChatMessageRepository {
  /** Persists a new chat message and returns the saved entity. */
  create(data: Omit<ChatMessageEntity, 'id' | 'createdAt'>): Promise<ChatMessageEntity>

  /**
   * Returns the most recent `limit` messages for a board, ordered oldest-first.
   * Used to populate history on WebSocket connect.
   */
  findByBoardId(boardId: string, limit: number): Promise<ChatMessageEntity[]>
}
