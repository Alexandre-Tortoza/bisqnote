import { describe, it, expect, vi } from 'vitest'
import Fastify from 'fastify'
import websocketPlugin from '@fastify/websocket'
import fp from 'fastify-plugin'
import type { IUserRepository } from '../../../domain/repositories/IUserRepository.js'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IKanbanColumnRepository } from '../../../domain/repositories/IKanbanColumnRepository.js'
import type { IKanbanTaskRepository } from '../../../domain/repositories/IKanbanTaskRepository.js'
import { kanbanRoutes } from '../../../infra/http/routes/kanban.js'
import { errorHandlerPlugin } from '../../../infra/http/plugins/errorHandler.js'

function makeFakes() {
  return {
    userRepo: {
      create: vi.fn(),
      findByUsername: vi.fn(),
      findByTokenHash: vi.fn(),
      updateTokenHash: vi.fn(),
    } satisfies IUserRepository,
    memberRepo: {
      create: vi.fn(),
      findById: vi.fn(),
      findByUserAndBoard: vi.fn(),
      updateTokenHash: vi.fn(),
      findAllByBoardId: vi.fn(),
    } satisfies IMemberRepository,
    columnRepo: {
      create: vi.fn(),
      findByBoardId: vi.fn(),
      getMaxPosition: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } satisfies IKanbanColumnRepository,
    taskRepo: {
      create: vi.fn(),
      findByBoardId: vi.fn(),
      getMaxPositionInColumn: vi.fn(),
      update: vi.fn(),
      move: vi.fn(),
      delete: vi.fn(),
    } satisfies IKanbanTaskRepository,
  }
}

async function buildTestApp() {
  const fakes = makeFakes()
  const app = Fastify({ logger: false })

  await app.register(errorHandlerPlugin)

  const dbMockPlugin = fp(async (fastify) => {
    fastify.decorate('db', {} as never)
  })

  await app.register(dbMockPlugin)
  await app.register(websocketPlugin)
  await app.register(kanbanRoutes, fakes)

  return { app, fakes }
}

describe('GET /api/boards/:id/kanban (WebSocket)', () => {
  it('returns 404 when request is not a WebSocket upgrade', async () => {
    const { app } = await buildTestApp()
    const res = await app.inject({
      method: 'GET',
      url: '/api/boards/board-1/kanban',
    })
    expect(res.statusCode).toBe(404)
  })

  it('registers the /kanban route under the boards path', async () => {
    const { app } = await buildTestApp()
    const routes = app.printRoutes()
    expect(routes).toContain('/kanban (GET, HEAD)')
  })
})
