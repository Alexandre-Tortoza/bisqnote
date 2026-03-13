import { createHash } from 'node:crypto'
import { AppError } from '../errors/AppError.js'
import type { IUserRepository } from '../repositories/IUserRepository.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { IKanbanTaskRepository } from '../repositories/IKanbanTaskRepository.js'
import type { KanbanTaskEntity } from '../entities/KanbanTask.js'

/** Validates membership and updates a kanban task's fields. */
export class UpdateKanbanTaskUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly memberRepo: IMemberRepository,
    private readonly taskRepo: IKanbanTaskRepository,
  ) {}

  async execute(input: {
    userToken: string
    boardId: string
    taskId: string
    title?: string
    description?: string | null
    effort?: number | null
    dueDate?: string | null
    assignedTo?: string | null
  }): Promise<KanbanTaskEntity> {
    const { userToken, boardId, taskId, title, description, effort, dueDate, assignedTo } = input

    const tokenHash = createHash('sha256').update(userToken).digest('hex')
    const user = await this.userRepo.findByTokenHash(tokenHash)
    if (!user) throw new AppError('INVALID_USER_TOKEN', 'Invalid or expired user token')

    const member = await this.memberRepo.findByUserAndBoard(user.id, boardId)
    if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

    const tasks = await this.taskRepo.findByBoardId(boardId)
    const task = tasks.find((t) => t.id === taskId)
    if (!task) throw new AppError('TASK_NOT_FOUND', 'Task does not exist in this board')

    const updates: {
      title?: string
      description?: string | null
      effort?: number | null
      dueDate?: string | null
      assignedTo?: string | null
    } = {}

    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (effort !== undefined) updates.effort = effort
    if (dueDate !== undefined) updates.dueDate = dueDate
    if (assignedTo !== undefined) updates.assignedTo = assignedTo

    return this.taskRepo.update(taskId, updates)
  }
}
