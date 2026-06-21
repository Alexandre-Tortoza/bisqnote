import { AppError } from '../errors/AppError.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { IKanbanColumnRepository } from '../repositories/IKanbanColumnRepository.js'

/** Validates membership and deletes a kanban column (cascades to its tasks). */
export class DeleteKanbanColumnUseCase {
  constructor(
    private readonly memberRepo: IMemberRepository,
    private readonly columnRepo: IKanbanColumnRepository,
  ) {}

  async execute(input: { userId: string; boardId: string; columnId: string }): Promise<void> {
    const { userId, boardId, columnId } = input

    const member = await this.memberRepo.findByUserAndBoard(userId, boardId)
    if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

    const columns = await this.columnRepo.findByBoardId(boardId)
    const column = columns.find((c) => c.id === columnId)
    if (!column) throw new AppError('COLUMN_NOT_FOUND', 'Column does not exist in this board')

    await this.columnRepo.delete(columnId)
  }
}
