import type { BoardEntity } from '../entities/Board.js'

/** Port for board persistence — implemented by infra layer only. */
export interface IBoardRepository {
  create(data: {
    isPrivate: boolean
    passwordHash: string | null
    ownerEmail: string | null
    encryptedContent: string
  }): Promise<BoardEntity>

  findById(id: string): Promise<BoardEntity | null>

  findByOwnerEmail(email: string): Promise<BoardEntity[]>
}
