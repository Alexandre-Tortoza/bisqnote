import { describe, it, expect, vi } from 'vitest'
import Fastify from 'fastify'
import fp from 'fastify-plugin'
import type { IEmailService } from '../../../domain/services/IEmailService.js'
import type { IBoardRepository } from '../../../domain/repositories/IBoardRepository.js'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IGoBackLinkRepository } from '../../../domain/repositories/IGoBackLinkRepository.js'
import type { IUserRepository } from '../../../domain/repositories/IUserRepository.js'
import { boardRoutes } from '../../../infra/http/routes/boards.js'
import { errorHandlerPlugin } from '../../../infra/http/plugins/errorHandler.js'

const makeUser = () => ({
  id: 'user-1',
  username: 'johndoe',
  passwordHash: 'hash',
  tokenHash: 'tokenhash',
  createdAt: new Date(),
})

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
    findById: vi.fn().mockResolvedValue(null),
    findByOwnerEmail: vi.fn().mockResolvedValue([]),
  } satisfies IBoardRepository,
  memberRepo: {
    create: vi.fn().mockResolvedValue({
      id: 'member-1',
      boardId: 'board-1',
      userId: 'user-1',
      tokenHash: 'hash',
      role: 'owner',
      encryptedContent: '{}',
    }),
    findById: vi.fn().mockResolvedValue(null),
    findByUserAndBoard: vi.fn().mockResolvedValue(null),
    updateTokenHash: vi.fn().mockResolvedValue(undefined),
    findAllByBoardId: vi.fn(),
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
  userRepo: {
    create: vi.fn().mockResolvedValue(makeUser()),
    findByUsername: vi.fn().mockResolvedValue(null),
    findByTokenHash: vi.fn().mockResolvedValue(makeUser()),
    updateTokenHash: vi.fn().mockResolvedValue(undefined),
  } satisfies IUserRepository,
})

async function buildTestApp() {
  const fakes = makeFakeDb()
  const app = Fastify({ logger: false })

  await app.register(errorHandlerPlugin)

  const dbMockPlugin = fp(async (fastify) => {
    fastify.decorate('db', {} as never)
    fastify.decorate('emailService', fakes.emailService)
  })

  await app.register(dbMockPlugin)
  await app.register(boardRoutes, {
    boardRepo: fakes.boardRepo,
    memberRepo: fakes.memberRepo,
    goBackLinkRepo: fakes.goBackLinkRepo,
    userRepo: fakes.userRepo,
  })

  return { app, fakes }
}

describe('POST /api/boards', () => {
  it('returns 201 with boardId and memberToken', async () => {
    const { app } = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/boards',
      payload: { name: 'Test Board', userToken: 'valid-token' },
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
      payload: { userToken: 'valid-token' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when isPrivate=true but no password', async () => {
    const { app } = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/boards',
      payload: { name: 'Secret', isPrivate: true, userToken: 'valid-token' },
    })
    // Schema-level 'if/then' rejects the request before it reaches domain logic
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when board password is shorter than 8 characters', async () => {
    const { app } = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/boards',
      payload: { name: 'Secret', isPrivate: true, password: 'short', userToken: 'valid-token' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when board name exceeds 200 characters', async () => {
    const { app } = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/boards',
      payload: { name: 'A'.repeat(201), userToken: 'valid-token' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 401 when userToken is invalid', async () => {
    const { app, fakes } = await buildTestApp()
    vi.mocked(fakes.userRepo.findByTokenHash).mockResolvedValueOnce(null)
    const res = await app.inject({
      method: 'POST',
      url: '/api/boards',
      payload: { name: 'Test Board', userToken: 'bad-token' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 500 with generic message when boardRepo.create throws', async () => {
    const { app, fakes } = await buildTestApp()
    fakes.boardRepo.create.mockRejectedValueOnce(
      new Error('SELECT * FROM boards WHERE id = $1 -- raw query detail'),
    )

    const res = await app.inject({
      method: 'POST',
      url: '/api/boards',
      payload: { name: 'Test Board', userToken: 'valid-token' },
    })
    expect(res.statusCode).toBe(500)
    const body = res.json()
    expect(body.error).toBe('Internal server error')
    expect(body.error).not.toContain('query')
    expect(body.error).not.toContain('SELECT')
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
