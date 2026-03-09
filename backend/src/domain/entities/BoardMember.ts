/** Board member identity — token-based, no global user accounts. */
export interface BoardMemberEntity {
  id: string
  boardId: string
  tokenHash: string
  role: 'owner' | 'member'
  encryptedContent: string
}
