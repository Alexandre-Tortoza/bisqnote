import { AppError } from '../errors/AppError.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { IKanbanColumnRepository } from '../repositories/IKanbanColumnRepository.js'
import type { IKanbanTaskRepository } from '../repositories/IKanbanTaskRepository.js'
import type { KanbanTaskEntity } from '../entities/KanbanTask.js'

/** Validates membership and moves a task to a target column at the given position. */
export class MoveKanbanTaskUseCase {
  constructor(
    private readonly memberRepo: IMemberRepository,
    private readonly columnRepo: IKanbanColumnRepository,
    private readonly taskRepo: IKanbanTaskRepository,
  ) {}

  async execute(input: {
    userId: string
    boardId: string
    taskId: string
    columnId: string
    position: number
  }): Promise<KanbanTaskEntity> {
    const { userId, boardId, taskId, columnId, position } = input

    const member = await this.memberRepo.findByUserAndBoard(userId, boardId)
    if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

    const [columns, tasks] = await Promise.all([
      this.columnRepo.findByBoardId(boardId),
      this.taskRepo.findByBoardId(boardId),
    ])

    const targetColumn = columns.find((c) => c.id === columnId)
    if (!targetColumn) throw new AppError('COLUMN_NOT_FOUND', 'Column does not exist in this board')

    const task = tasks.find((t) => t.id === taskId)
    if (!task) throw new AppError('TASK_NOT_FOUND', 'Task does not exist in this board')

    return this.taskRepo.move(taskId, columnId, position)
  }
}
