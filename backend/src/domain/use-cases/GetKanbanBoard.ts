import { AppError } from '../errors/AppError.js'
import type { IMemberRepository, BoardMemberInfo } from '../repositories/IMemberRepository.js'
import type { IKanbanColumnRepository } from '../repositories/IKanbanColumnRepository.js'
import type { IKanbanTaskRepository } from '../repositories/IKanbanTaskRepository.js'
import type { KanbanTaskEntity } from '../entities/KanbanTask.js'

export interface KanbanColumnWithTasks {
  id: string
  boardId: string
  position: number
  encryptedContent: string
  createdAt: Date
  tasks: KanbanTaskEntity[]
}

export interface GetKanbanBoardOutput {
  columns: KanbanColumnWithTasks[]
  members: BoardMemberInfo[]
}

/** Returns the full kanban board state (columns + tasks + members) after verifying membership. */
export class GetKanbanBoardUseCase {
  constructor(
    private readonly memberRepo: IMemberRepository,
    private readonly columnRepo: IKanbanColumnRepository,
    private readonly taskRepo: IKanbanTaskRepository,
  ) {}

  async execute(input: { userId: string; boardId: string }): Promise<GetKanbanBoardOutput> {
    const { userId, boardId } = input

    const member = await this.memberRepo.findByUserAndBoard(userId, boardId)
    if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

    const [columns, tasks, members] = await Promise.all([
      this.columnRepo.findByBoardId(boardId),
      this.taskRepo.findByBoardId(boardId),
      this.memberRepo.findAllByBoardId(boardId),
    ])

    const tasksByColumn = new Map<string, KanbanTaskEntity[]>()
    for (const task of tasks) {
      const list = tasksByColumn.get(task.columnId) ?? []
      list.push(task)
      tasksByColumn.set(task.columnId, list)
    }

    const columnsWithTasks: KanbanColumnWithTasks[] = columns.map((col) => ({
      ...col,
      tasks: tasksByColumn.get(col.id) ?? [],
    }))

    return { columns: columnsWithTasks, members }
  }
}
