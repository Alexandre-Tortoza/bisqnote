import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import fp from 'fastify-plugin'
import type { IEmailService } from '../../../domain/services/IEmailService.js'
import type { IBoardRepository } from '../../../domain/repositories/IBoardRepository.js'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IGoBackLinkRepository } from '../../../domain/repositories/IGoBackLinkRepository.js'
import { boardRoutes } from '../../../infra/http/routes/boards.js'

const makeFakeDb = () => ({
  boardRepo: {
    create: vi.fn().mockResolvedValue({
      id: 'board-1',
      isPrivate: false,
      passwordHash: null,
      ownerEmail: null,
      encryptedContent: '{"name":"Test"}',
      createdAt: new Date(),
    }),
    findByOwnerEmail: vi.fn().mockResolvedValue([]),
  } satisfies IBoardRepository,
  memberRepo: {
    create: vi.fn().mockResolvedValue({
      id: 'member-1',
      boardId: 'board-1',
      tokenHash: 'hash',
      role: 'owner',
      encryptedContent: '{}',
    }),
    findById: vi.fn().mockResolvedValue(null),
    updateTokenHash: vi.fn().mockResolvedValue(undefined),
  } satisfies IMemberRepository,
  goBackLinkRepo: {
    create: vi.fn().mockResolvedValue({ id: 'link-1', boardId: 'board-1', memberId: 'member-1', token: 'tok', expiresAt: new Date(), usedAt: null }),
    findByToken: vi.fn().mockResolvedValue(null),
    markUsed: vi.fn().mockResolvedValue(undefined),
  } satisfies IGoBackLinkRepository,
  emailService: {
    sendBoardCreated: vi.fn().mockResolvedValue(undefined),
    sendRecovery: vi.fn().mockResolvedValue(undefined),
  } satisfies IEmailService,
})

async function buildTestApp() {
  const fakes = makeFakeDb()
  const app = Fastify()

  const dbMockPlugin = fp(async (fastify) => {
    fastify.decorate('db', {} as never)
    fastify.decorate('emailService', fakes.emailService)
  })

  await app.register(dbMockPlugin)
  await app.register(boardRoutes, {
    boardRepo: fakes.boardRepo,
    memberRepo: fakes.memberRepo,
    goBackLinkRepo: fakes.goBackLinkRepo,
  })

  return { app, fakes }
}

describe('POST /api/boards', () => {
  it('returns 201 with boardId and memberToken', async () => {
    const { app } = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/boards',
      payload: { name: 'Test Board' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body).toMatchObject({ boardId: 'board-1', role: 'owner' })
    expect(typeof body.memberToken).toBe('string')
  })

  it('returns 400 when name is missing', async () => {
    const { app } = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/boards',
      payload: {},
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when isPrivate=true but no password', async () => {
    const { app } = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/boards',
      payload: { name: 'Secret', isPrivate: true },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /api/boards/recover', () => {
  it('always returns 200 with sent=true', async () => {
    const { app } = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/boards/recover',
      payload: { email: 'user@example.com' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ sent: true })
  })

  it('returns 400 when email is missing', async () => {
    const { app } = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/boards/recover',
      payload: {},
    })
    expect(res.statusCode).toBe(400)
  })
})
