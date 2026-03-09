/** Global user account — persists across multiple boards. */
export interface UserEntity {
  id: string
  username: string
  passwordHash: string
  tokenHash: string | null
  createdAt: Date
}
