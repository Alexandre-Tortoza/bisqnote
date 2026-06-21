import { AppError } from '../errors/AppError.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { IBoardFileRepository } from '../repositories/IBoardFileRepository.js'
import type { BoardFileEntity } from '../entities/BoardFile.js'

/**
 * Removes a board file record and returns the entity so the route handler can
 * clean up the binary from disk when the file type is 'file'.
 */
export class DeleteBoardFileUseCase {
  constructor(
    private readonly memberRepo: IMemberRepository,
    private readonly fileRepo: IBoardFileRepository,
  ) {}

  async execute(input: {
    userId: string
    boardId: string
    fileId: string
  }): Promise<BoardFileEntity> {
    const { userId, boardId, fileId } = input

    const member = await this.memberRepo.findByUserAndBoard(userId, boardId)
    if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

    const file = await this.fileRepo.findById(fileId)
    if (!file) throw new AppError('FILE_NOT_FOUND', 'File not found')
    if (file.boardId !== boardId) throw new AppError('BOARD_MISMATCH', 'File does not belong to this board')

    await this.fileRepo.delete(fileId)
    return file
  }
}
