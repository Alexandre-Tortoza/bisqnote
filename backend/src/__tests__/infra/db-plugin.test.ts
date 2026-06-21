import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'

vi.mock('../../infra/db/connection.js', () => ({
  createClient: vi.fn(() => ({ end: vi.fn() })),
}))

vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: vi.fn(() => ({ _isDrizzle: true })),
}))

describe('dbPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('decorates fastify with db', async () => {
    const { dbPlugin } = await import('../../infra/http/plugins/db.js')

    const app = Fastify()
    await app.register(dbPlugin)
    await app.ready()

    expect(app.db).toBeDefined()
    expect(app.db).toHaveProperty('_isDrizzle', true)
  })
})
