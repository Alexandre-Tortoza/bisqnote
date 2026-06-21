/** Port for email delivery — implemented by infra layer only. */
export interface IEmailService {
  sendBoardCreated(payload: {
    to: string
    boardId: string
    boardName: string
    memberToken: string
    goBackToken: string
    appUrl: string
  }): Promise<void>

  sendRecovery(payload: {
    to: string
    boards: { boardId: string; boardName: string; goBackToken: string }[]
    appUrl: string
  }): Promise<void>
}
