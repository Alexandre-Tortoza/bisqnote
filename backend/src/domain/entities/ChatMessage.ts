/**
 * A single message posted by a board member in the board's chat channel.
 * The `content` field holds a JSON string with shape `{ text: string, username: string }`.
 */
export interface ChatMessageEntity {
  id: string
  boardId: string
  memberId: string | null
  /** JSON: { text: string, username: string } */
  content: string
  createdAt: Date
}
