import { AppError } from '../errors/AppError.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { IKanbanColumnRepository } from '../repositories/IKanbanColumnRepository.js'
import type { IKanbanTaskRepository } from '../repositories/IKanbanTaskRepository.js'
import type { KanbanTaskEntity } from '../entities/KanbanTask.js'

/** Validates membership and creates a new kanban task at the bottom of a column. */
export class CreateKanbanTaskUseCase {
  constructor(
    private readonly memberRepo: IMemberRepository,
    private readonly columnRepo: IKanbanColumnRepository,
    private readonly taskRepo: IKanbanTaskRepository,
  ) {}

  async execute(input: {
    userId: string
    boardId: string
    columnId: string
    encryptedContent: string
  }): Promise<KanbanTaskEntity> {
    const { userId, boardId, columnId, encryptedContent } = input

    const member = await this.memberRepo.findByUserAndBoard(userId, boardId)
    if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

    const columns = await this.columnRepo.findByBoardId(boardId)
    const column = columns.find((c) => c.id === columnId)
    if (!column) throw new AppError('COLUMN_NOT_FOUND', 'Column does not exist in this board')

    const maxPosition = await this.taskRepo.getMaxPositionInColumn(columnId)
    return this.taskRepo.create({ columnId, boardId, encryptedContent, position: maxPosition + 1 })
  }
}
