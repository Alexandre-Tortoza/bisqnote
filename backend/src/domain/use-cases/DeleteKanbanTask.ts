import { AppError } from '../errors/AppError.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { IKanbanTaskRepository } from '../repositories/IKanbanTaskRepository.js'

/** Validates membership and deletes a kanban task. */
export class DeleteKanbanTaskUseCase {
  constructor(
    private readonly memberRepo: IMemberRepository,
    private readonly taskRepo: IKanbanTaskRepository,
  ) {}

  async execute(input: { userId: string; boardId: string; taskId: string }): Promise<void> {
    const { userId, boardId, taskId } = input

    const member = await this.memberRepo.findByUserAndBoard(userId, boardId)
    if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

    const tasks = await this.taskRepo.findByBoardId(boardId)
    const task = tasks.find((t) => t.id === taskId)
    if (!task) throw new AppError('TASK_NOT_FOUND', 'Task does not exist in this board')

    await this.taskRepo.delete(taskId)
  }
}
