import { AppError } from '../errors/AppError.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { IBoardFileRepository } from '../repositories/IBoardFileRepository.js'
import type { BoardFileEntity } from '../entities/BoardFile.js'

/** Validates membership and persists an external link on the board. */
export class AddBoardLinkUseCase {
  constructor(
    private readonly memberRepo: IMemberRepository,
    private readonly fileRepo: IBoardFileRepository,
  ) {}

  async execute(input: {
    userId: string
    boardId: string
    name: string
    url: string
  }): Promise<BoardFileEntity> {
    const { userId, boardId, name, url } = input

    if (!name.trim()) throw new AppError('INVALID_INPUT', 'Name is required')
    if (name.length > 200) throw new AppError('INVALID_INPUT', 'Name must be 200 characters or fewer')
    if (!url.trim()) throw new AppError('INVALID_INPUT', 'URL is required')

    const member = await this.memberRepo.findByUserAndBoard(userId, boardId)
    if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

    return this.fileRepo.createLink({ boardId, uploadedBy: member.id, name: name.trim(), url: url.trim() })
  }
}
