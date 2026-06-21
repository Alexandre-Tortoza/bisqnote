import { describe, it, expect, vi } from 'vitest'
import Fastify from 'fastify'
import websocketPlugin from '@fastify/websocket'
import fp from 'fastify-plugin'
import type { IUserRepository } from '../../../domain/repositories/IUserRepository.js'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IChatMessageRepository } from '../../../domain/repositories/IChatMessageRepository.js'
import { chatRoutes } from '../../../infra/http/routes/chat.js'
import { errorHandlerPlugin } from '../../../infra/http/plugins/errorHandler.js'

const makeUser = () => ({
  id: 'user-1',
  username: 'alice',
  passwordHash: 'hash',
  tokenHash: 'sha256token',
  createdAt: new Date(),
})

const makeMember = () => ({
  id: 'member-1',
  boardId: 'board-1',
  userId: 'user-1',
  tokenHash: 'hash',
  role: 'member' as const,
  encryptedContent: '{}',
})

function makeFakes() {
  return {
    userRepo: {
      create: vi.fn(),
      findByUsername: vi.fn(),
      findByTokenHash: vi.fn().mockResolvedValue(makeUser()),
      updateTokenHash: vi.fn(),
    } satisfies IUserRepository,
    memberRepo: {
      create: vi.fn(),
      findById: vi.fn(),
      findByUserAndBoard: vi.fn().mockResolvedValue(makeMember()),
      updateTokenHash: vi.fn(),
      findAllByBoardId: vi.fn(),
    } satisfies IMemberRepository,
    chatRepo: {
      create: vi.fn().mockResolvedValue({
        id: 'msg-1',
        boardId: 'board-1',
        memberId: 'member-1',
        content: 'encrypted-hello',
        createdAt: new Date(),
      }),
      findByBoardId: vi.fn().mockResolvedValue([]),
    } satisfies IChatMessageRepository,
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
  await app.register(chatRoutes, fakes)

  return { app, fakes }
}

describe('GET /api/boards/:id/chat (WebSocket)', () => {
  it('returns 404 when request is not a WebSocket upgrade', async () => {
    const { app } = await buildTestApp()
    // Regular HTTP GET (no Upgrade header) to a WS-only route returns 404
    const res = await app.inject({
      method: 'GET',
      url: '/api/boards/board-1/chat',
    })
    expect(res.statusCode).toBe(404)
  })

  it('registers the /chat route under the boards path', async () => {
    const { app } = await buildTestApp()
    const routes = app.printRoutes()
    // printRoutes() outputs a tree; verify the chat path segment is present
    expect(routes).toContain('/chat (GET, HEAD)')
  })
})
