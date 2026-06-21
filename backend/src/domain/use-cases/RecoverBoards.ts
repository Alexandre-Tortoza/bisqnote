import type { IBoardRepository } from '../repositories/IBoardRepository.js'
import type { IGoBackLinkRepository } from '../repositories/IGoBackLinkRepository.js'
import type { IEmailService } from '../services/IEmailService.js'

/** Sends recovery emails for all boards associated with a given email — silent if none found. */
export class RecoverBoardsUseCase {
  constructor(
    private readonly boardRepo: IBoardRepository,
    private readonly goBackLinkRepo: IGoBackLinkRepository,
    private readonly emailService: IEmailService,
  ) {}

  async execute(email: string): Promise<void> {
    const boards = await this.boardRepo.findByOwnerEmail(email)
    if (boards.length === 0) return

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const appUrl = process.env['APP_URL'] ?? 'http://localhost:5173'

    const boardsWithTokens = await Promise.all(
      boards.map(async (board) => {
        const goBackToken = crypto.randomUUID()
        const name = JSON.parse(board.encryptedContent).name as string

        await this.goBackLinkRepo.create({
          boardId: board.id,
          memberId: board.id, // placeholder — owner member lookup not needed for recovery
          token: goBackToken,
          expiresAt,
        })

        return { boardId: board.id, boardName: name, goBackToken }
      }),
    )

    await this.emailService.sendRecovery({ to: email, boards: boardsWithTokens, appUrl })
  }
}
