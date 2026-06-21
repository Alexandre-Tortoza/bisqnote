import { AppError } from '../errors/AppError.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { IBoardFileRepository } from '../repositories/IBoardFileRepository.js'
import type { BoardFileEntity } from '../entities/BoardFile.js'

const MAX_FILE_BYTES = 10_485_760 // 10 MB

/**
 * Persists file metadata after the binary has already been written to disk by
 * the route handler. This use case validates constraints and membership only.
 */
export class UploadBoardFileUseCase {
  constructor(
    private readonly memberRepo: IMemberRepository,
    private readonly fileRepo: IBoardFileRepository,
  ) {}

  async execute(input: {
    userId: string
    boardId: string
    name: string
    mimeType: string
    sizeBytes: number
    storageKey: string
  }): Promise<BoardFileEntity> {
    const { userId, boardId, name, mimeType, sizeBytes, storageKey } = input

    if (!name.trim()) throw new AppError('INVALID_INPUT', 'Name is required')
    if (name.length > 200) throw new AppError('INVALID_INPUT', 'Name must be 200 characters or fewer')
    if (sizeBytes > MAX_FILE_BYTES) throw new AppError('INVALID_INPUT', 'File must be 10 MB or smaller')

    const member = await this.memberRepo.findByUserAndBoard(userId, boardId)
    if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

    return this.fileRepo.createFile({
      boardId,
      uploadedBy: member.id,
      name: name.trim(),
      mimeType,
      sizeBytes,
      storageKey,
    })
  }
}
