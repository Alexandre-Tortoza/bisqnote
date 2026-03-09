import type { BoardMemberEntity } from '../entities/BoardMember.js'

/** Port for board member persistence — implemented by infra layer only. */
export interface IMemberRepository {
  create(data: {
    boardId: string
    tokenHash: string
    role: 'owner' | 'member'
    encryptedContent: string
  }): Promise<BoardMemberEntity>

  findById(id: string): Promise<BoardMemberEntity | null>

  updateTokenHash(id: string, tokenHash: string): Promise<void>
}
