import type { IBoardRepository } from '../repositories/IBoardRepository.js'

export interface GetBoardMetaOutput {
  isPrivate: boolean
  name: string
}

/** Returns public metadata for a board without requiring authentication. */
export class GetBoardMetaUseCase {
  constructor(private readonly boardRepo: IBoardRepository) {}

  async execute(boardId: string): Promise<GetBoardMetaOutput | null> {
    const board = await this.boardRepo.findById(boardId)
    if (!board) return null

    const { name } = JSON.parse(board.encryptedContent) as { name: string }
    return { isPrivate: board.isPrivate, name }
  }
}
