import { createHash } from 'node:crypto'
import { AppError } from '../errors/AppError.js'
import type { IUserRepository } from '../repositories/IUserRepository.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { IKanbanColumnRepository } from '../repositories/IKanbanColumnRepository.js'
import type { IKanbanTaskRepository } from '../repositories/IKanbanTaskRepository.js'
import type { KanbanTaskEntity } from '../entities/KanbanTask.js'

/** Validates membership and creates a new kanban task at the bottom of a column. */
export class CreateKanbanTaskUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly memberRepo: IMemberRepository,
    private readonly columnRepo: IKanbanColumnRepository,
    private readonly taskRepo: IKanbanTaskRepository,
  ) {}

  async execute(input: {
    userToken: string
    boardId: string
    columnId: string
    title: string
  }): Promise<KanbanTaskEntity> {
    const { userToken, boardId, columnId, title } = input

    if (!title || title.length === 0) {
      throw new AppError('INVALID_INPUT', 'Task title must not be empty')
    }
    if (title.length > 200) {
      throw new AppError('INVALID_INPUT', 'Task title must not exceed 200 characters')
    }

    const tokenHash = createHash('sha256').update(userToken).digest('hex')
    const user = await this.userRepo.findByTokenHash(tokenHash)
    if (!user) throw new AppError('INVALID_USER_TOKEN', 'Invalid or expired user token')

    const member = await this.memberRepo.findByUserAndBoard(user.id, boardId)
    if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

    const columns = await this.columnRepo.findByBoardId(boardId)
    const column = columns.find((c) => c.id === columnId)
    if (!column) throw new AppError('COLUMN_NOT_FOUND', 'Column does not exist in this board')

    const maxPosition = await this.taskRepo.getMaxPositionInColumn(columnId)
    return this.taskRepo.create({ columnId, boardId, title, position: maxPosition + 1 })
  }
}
