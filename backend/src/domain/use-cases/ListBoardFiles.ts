import { AppError } from '../errors/AppError.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { IBoardFileRepository } from '../repositories/IBoardFileRepository.js'
import type { BoardFileEntity } from '../entities/BoardFile.js'

/** Returns all files and links for a board after validating membership. */
export class ListBoardFilesUseCase {
  constructor(
    private readonly memberRepo: IMemberRepository,
    private readonly fileRepo: IBoardFileRepository,
  ) {}

  async execute(input: { userId: string; boardId: string }): Promise<BoardFileEntity[]> {
    const { userId, boardId } = input

    const member = await this.memberRepo.findByUserAndBoard(userId, boardId)
    if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

    return this.fileRepo.findByBoardId(boardId)
  }
}
