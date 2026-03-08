import fp from 'fastify-plugin'
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { createClient } from '../../db/connection.js'

declare module 'fastify' {
  interface FastifyInstance {
    db: PostgresJsDatabase
  }
}

/**
 * Fastify plugin that connects to PostgreSQL via Drizzle and decorates
 * the fastify instance with `fastify.db` — available across all scopes.
 */
export const dbPlugin = fp(async (fastify) => {
  const client = createClient()
  const db = drizzle(client)

  fastify.decorate('db', db)

  fastify.addHook('onClose', async () => {
    await client.end()
  })
})
