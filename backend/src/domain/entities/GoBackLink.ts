/** One-time token that lets a member return to a board without re-entering a password. */
export interface GoBackLinkEntity {
  id: string
  boardId: string
  memberId: string
  token: string
  expiresAt: Date
  usedAt: Date | null
}
