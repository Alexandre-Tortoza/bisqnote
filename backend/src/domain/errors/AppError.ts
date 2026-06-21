/** Domain error for expected failures that should be communicated to the client. */
export class AppError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message)
    this.name = 'AppError'
  }
}
