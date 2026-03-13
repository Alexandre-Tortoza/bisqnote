import { createHash } from 'node:crypto'
import { AppError } from '../errors/AppError.js'
import type { IUserRepository } from '../repositories/IUserRepository.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { IKanbanColumnRepository } from '../repositories/IKanbanColumnRepository.js'
import type { KanbanColumnEntity } from '../entities/KanbanColumn.js'

/** Validates membership and creates a new kanban column at the end of the board. */
export class CreateKanbanColumnUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly memberRepo: IMemberRepository,
    private readonly columnRepo: IKanbanColumnRepository,
  ) {}

  async execute(input: { userToken: string; boardId: string; title: string }): Promise<KanbanColumnEntity> {
    const { userToken, boardId, title } = input

    if (!title || title.length === 0) {
      throw new AppError('INVALID_INPUT', 'Column title must not be empty')
    }
    if (title.length > 100) {
      throw new AppError('INVALID_INPUT', 'Column title must not exceed 100 characters')
    }

    const tokenHash = createHash('sha256').update(userToken).digest('hex')
    const user = await this.userRepo.findByTokenHash(tokenHash)
    if (!user) throw new AppError('INVALID_USER_TOKEN', 'Invalid or expired user token')

    const member = await this.memberRepo.findByUserAndBoard(user.id, boardId)
    if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

    const maxPosition = await this.columnRepo.getMaxPosition(boardId)
    return this.columnRepo.create({ boardId, title, position: maxPosition + 1 })
  }
}
