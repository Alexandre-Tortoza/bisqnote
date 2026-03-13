import type { BoardMemberEntity } from '../entities/BoardMember.js'

/** Minimal member info with resolved username — used for board member listings. */
export interface BoardMemberInfo {
  memberId: string
  username: string
}

/** Port for board member persistence — implemented by infra layer only. */
export interface IMemberRepository {
  create(data: {
    boardId: string
    userId?: string | null
    tokenHash: string
    role: 'owner' | 'member'
    encryptedContent: string
  }): Promise<BoardMemberEntity>

  findById(id: string): Promise<BoardMemberEntity | null>

  findByUserAndBoard(userId: string, boardId: string): Promise<BoardMemberEntity | null>

  updateTokenHash(id: string, tokenHash: string): Promise<void>

  /** Returns all members of a board with their resolved usernames. */
  findAllByBoardId(boardId: string): Promise<BoardMemberInfo[]>
}
