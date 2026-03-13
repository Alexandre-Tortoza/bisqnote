import { createHash } from 'node:crypto'
import { AppError } from '../errors/AppError.js'
import type { IUserRepository } from '../repositories/IUserRepository.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { IKanbanColumnRepository } from '../repositories/IKanbanColumnRepository.js'
import type { KanbanColumnEntity } from '../entities/KanbanColumn.js'

/** Validates membership and updates a kanban column's title or position. */
export class UpdateKanbanColumnUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly memberRepo: IMemberRepository,
    private readonly columnRepo: IKanbanColumnRepository,
  ) {}

  async execute(input: {
    userToken: string
    boardId: string
    columnId: string
    title?: string
    position?: number
  }): Promise<KanbanColumnEntity> {
    const { userToken, boardId, columnId, title, position } = input

    const tokenHash = createHash('sha256').update(userToken).digest('hex')
    const user = await this.userRepo.findByTokenHash(tokenHash)
    if (!user) throw new AppError('INVALID_USER_TOKEN', 'Invalid or expired user token')

    const member = await this.memberRepo.findByUserAndBoard(user.id, boardId)
    if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

    const columns = await this.columnRepo.findByBoardId(boardId)
    const column = columns.find((c) => c.id === columnId)
    if (!column) throw new AppError('COLUMN_NOT_FOUND', 'Column does not exist in this board')

    return this.columnRepo.update(columnId, { title, position })
  }
}
