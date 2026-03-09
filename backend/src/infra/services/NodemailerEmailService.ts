import { createTransport, type Transporter } from 'nodemailer'
import type { IEmailService } from '../../domain/services/IEmailService.js'

interface SmtpConfig {
  host: string
  port: number
  auth: { user: string; pass: string }
}

/** Nodemailer implementation of IEmailService — sends plain-text emails. */
export class NodemailerEmailService implements IEmailService {
  private readonly transporter: Transporter

  constructor(config: SmtpConfig) {
    this.transporter = createTransport({
      host: config.host,
      port: config.port,
      auth: config.auth,
    })
  }

  async sendBoardCreated(payload: {
    to: string
    boardId: string
    boardName: string
    memberToken: string
    goBackToken: string
    appUrl: string
  }): Promise<void> {
    const boardUrl = `${payload.appUrl}/board/${payload.boardId}`
    const goBackUrl = `${payload.appUrl}/go-back/${payload.goBackToken}`

    await this.transporter.sendMail({
      to: payload.to,
      subject: `Your board "${payload.boardName}" has been created`,
      text: [
        `Your board "${payload.boardName}" is ready!`,
        '',
        `Board URL: ${boardUrl}`,
        `Your token: ${payload.memberToken}`,
        '',
        `Recovery link (valid 30 days): ${goBackUrl}`,
        '',
        'Keep this email — it is the only way to recover access to your board.',
      ].join('\n'),
    })
  }

  async sendRecovery(payload: {
    to: string
    boards: { boardId: string; boardName: string; goBackToken: string }[]
    appUrl: string
  }): Promise<void> {
    const boardLines = payload.boards
      .map(
        (b) =>
          `  - ${b.boardName}: ${payload.appUrl}/go-back/${b.goBackToken}`,
      )
      .join('\n')

    await this.transporter.sendMail({
      to: payload.to,
      subject: 'Your board recovery links',
      text: [
        'Here are your recovery links (each valid for 30 days):',
        '',
        boardLines,
        '',
        'Each link can only be used once.',
      ].join('\n'),
    })
  }
}
