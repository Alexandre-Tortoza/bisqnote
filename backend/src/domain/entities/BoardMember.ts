/** Board member identity — linked to a global user account. */
export interface BoardMemberEntity {
  id: string
  boardId: string
  userId: string | null
  tokenHash: string
  role: 'owner' | 'member'
  encryptedContent: string
}
