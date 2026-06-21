import type { BoardFileEntity } from '../entities/BoardFile.js'

/** Port for board file and link persistence — implemented by the infra layer only. */
export interface IBoardFileRepository {
  /** Creates and returns a new link entry. */
  createLink(data: {
    boardId: string
    uploadedBy: string | null
    name: string
    url: string
  }): Promise<BoardFileEntity>

  /**
   * Creates and returns a new file entry.
   * The binary must already be written to disk before calling this method.
   */
  createFile(data: {
    boardId: string
    uploadedBy: string | null
    name: string
    mimeType: string
    sizeBytes: number
    storageKey: string
  }): Promise<BoardFileEntity>

  /** Returns all entries for a board, ordered newest first. */
  findByBoardId(boardId: string): Promise<BoardFileEntity[]>

  findById(id: string): Promise<BoardFileEntity | null>

  delete(id: string): Promise<void>
}
