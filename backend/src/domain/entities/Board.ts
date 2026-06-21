/** Core board entity — no framework dependencies. */
export interface BoardEntity {
  id: string
  isPrivate: boolean
  passwordHash: string | null
  ownerEmail: string | null
  encryptedContent: string
  createdAt: Date
}
