import { AppError } from '../errors/AppError.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { IKanbanTaskRepository } from '../repositories/IKanbanTaskRepository.js'
import type { KanbanTaskEntity } from '../entities/KanbanTask.js'

/** Validates membership and updates a kanban task's fields. */
export class UpdateKanbanTaskUseCase {
  constructor(
    private readonly memberRepo: IMemberRepository,
    private readonly taskRepo: IKanbanTaskRepository,
  ) {}

  async execute(input: {
    userId: string
    boardId: string
    taskId: string
    encryptedContent?: string
    assignedTo?: string | null
  }): Promise<KanbanTaskEntity> {
    const { userId, boardId, taskId, encryptedContent, assignedTo } = input

    const member = await this.memberRepo.findByUserAndBoard(userId, boardId)
    if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

    const tasks = await this.taskRepo.findByBoardId(boardId)
    const task = tasks.find((t) => t.id === taskId)
    if (!task) throw new AppError('TASK_NOT_FOUND', 'Task does not exist in this board')

    const updates: {
      encryptedContent?: string
      assignedTo?: string | null
    } = {}

    if (encryptedContent !== undefined) updates.encryptedContent = encryptedContent
    if (assignedTo !== undefined) updates.assignedTo = assignedTo

    return this.taskRepo.update(taskId, updates)
  }
}
