import fp from 'fastify-plugin'
import { NodemailerEmailService } from '../../services/NodemailerEmailService.js'
import type { IEmailService } from '../../../domain/services/IEmailService.js'

declare module 'fastify' {
  interface FastifyInstance {
    emailService: IEmailService
  }
}

/**
 * Fastify plugin that creates a Nodemailer email service and decorates
 * the fastify instance with `fastify.emailService` — available across all scopes.
 */
export const emailPlugin = fp(async (fastify) => {
  const host = process.env['SMTP_HOST'] ?? 'localhost'
  const port = parseInt(process.env['SMTP_PORT'] ?? '587', 10)
  const user = process.env['SMTP_USER'] ?? ''
  const pass = process.env['SMTP_PASS'] ?? ''

  const emailService = new NodemailerEmailService({ host, port, auth: { user, pass } })
  fastify.decorate('emailService', emailService)
})
