import { AppError } from '../errors/AppError.js'
import type { IMemberRepository } from '../repositories/IMemberRepository.js'
import type { IKanbanColumnRepository } from '../repositories/IKanbanColumnRepository.js'
import type { KanbanColumnEntity } from '../entities/KanbanColumn.js'

/** Validates membership and creates a new kanban column at the end of the board. */
export class CreateKanbanColumnUseCase {
  constructor(
    private readonly memberRepo: IMemberRepository,
    private readonly columnRepo: IKanbanColumnRepository,
  ) {}

  async execute(input: { userId: string; boardId: string; encryptedContent: string }): Promise<KanbanColumnEntity> {
    const { userId, boardId, encryptedContent } = input

    const member = await this.memberRepo.findByUserAndBoard(userId, boardId)
    if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

    const maxPosition = await this.columnRepo.getMaxPosition(boardId)
    return this.columnRepo.create({ boardId, encryptedContent, position: maxPosition + 1 })
  }
}
