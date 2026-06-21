/** A standalone file upload or external link shared on a board. */
export interface BoardFileEntity {
  id: string
  boardId: string
  /** Member ID of the uploader; null if the member was removed. */
  uploadedBy: string | null
  type: 'file' | 'link'
  /** Display name for both files and links. */
  name: string
  /** Present only when type === 'link'. */
  url: string | null
  /** MIME type — present only when type === 'file'. */
  mimeType: string | null
  /** File size in bytes — present only when type === 'file'. */
  sizeBytes: number | null
  /** UUID filename on disk — present only when type === 'file'. */
  storageKey: string | null
  createdAt: Date
}
