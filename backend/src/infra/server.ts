import Fastify from 'fastify'
import cors from '@fastify/cors'
import { dbPlugin } from './http/plugins/db.js'
import { emailPlugin } from './http/plugins/email.js'
import { boardRoutes } from './http/routes/boards.js'
import { goBackLinkRoutes } from './http/routes/goBackLinks.js'
import { DrizzleBoardRepository } from './repositories/DrizzleBoardRepository.js'
import { DrizzleMemberRepository } from './repositories/DrizzleMemberRepository.js'
import { DrizzleGoBackLinkRepository } from './repositories/DrizzleGoBackLinkRepository.js'

/**
 * Creates and configures the Fastify application instance.
 * Plugins and routes are registered here.
 */
export async function buildApp() {
  const app = Fastify({ logger: true })

  await app.register(cors, { origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:5173' })
  await app.register(dbPlugin)
  await app.register(emailPlugin)

  await app.register(boardRoutes, {
    boardRepo: new DrizzleBoardRepository(app.db),
    memberRepo: new DrizzleMemberRepository(app.db),
    goBackLinkRepo: new DrizzleGoBackLinkRepository(app.db),
  })

  await app.register(goBackLinkRoutes, {
    goBackLinkRepo: new DrizzleGoBackLinkRepository(app.db),
    memberRepo: new DrizzleMemberRepository(app.db),
  })

  return app
}

/**
 * Entry point — starts the HTTP server.
 */
async function main() {
  const app = await buildApp()

  try {
    await app.listen({ port: 3000, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

main()
