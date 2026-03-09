import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import fp from 'fastify-plugin'
import type { IUserRepository } from '../../../domain/repositories/IUserRepository.js'
import type { UserEntity } from '../../../domain/entities/User.js'
import { userRoutes } from '../../../infra/http/routes/users.js'
import { errorHandlerPlugin } from '../../../infra/http/plugins/errorHandler.js'

const makeUser = (overrides: Partial<UserEntity> = {}): UserEntity => ({
  id: 'user-1',
  username: 'johndoe',
  passwordHash: 'hashed',
  tokenHash: 'tokenhash',
  createdAt: new Date(),
  ...overrides,
})

function makeFakeUserRepo(): IUserRepository {
  return {
    create: vi.fn().mockResolvedValue(makeUser()),
    findByUsername: vi.fn().mockResolvedValue(null),
    findByTokenHash: vi.fn().mockResolvedValue(null),
    updateTokenHash: vi.fn().mockResolvedValue(undefined),
  }
}

async function buildTestApp(userRepo: IUserRepository) {
  const app = Fastify({ logger: false })
  await app.register(errorHandlerPlugin)
  const dbMockPlugin = fp(async (fastify) => {
    fastify.decorate('db', {} as never)
  })
  await app.register(dbMockPlugin)
  await app.register(userRoutes, { userRepo })
  return app
}

describe('POST /api/users/register', () => {
  let userRepo: IUserRepository

  beforeEach(() => {
    userRepo = makeFakeUserRepo()
  })

  it('returns 201 with userId, userToken, username on success', async () => {
    const app = await buildTestApp(userRepo)
    const res = await app.inject({
      method: 'POST',
      url: '/api/users/register',
      payload: { username: 'johndoe', password: 'secret123' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body).toMatchObject({ userId: 'user-1', username: 'johndoe' })
    expect(typeof body.userToken).toBe('string')
  })

  it('returns 400 when username is missing', async () => {
    const app = await buildTestApp(userRepo)
    const res = await app.inject({
      method: 'POST',
      url: '/api/users/register',
      payload: { password: 'secret123' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when password is missing', async () => {
    const app = await buildTestApp(userRepo)
    const res = await app.inject({
      method: 'POST',
      url: '/api/users/register',
      payload: { username: 'johndoe' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 409 when username is already taken', async () => {
    vi.mocked(userRepo.findByUsername).mockResolvedValue(makeUser())
    const app = await buildTestApp(userRepo)
    const res = await app.inject({
      method: 'POST',
      url: '/api/users/register',
      payload: { username: 'johndoe', password: 'secret123' },
    })
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toBe('Username already taken')
  })
})

describe('POST /api/users/login', () => {
  let userRepo: IUserRepository

  beforeEach(async () => {
    const { hash } = await import('bcryptjs')
    const passwordHash = await hash('secret123', 10)
    userRepo = makeFakeUserRepo()
    vi.mocked(userRepo.findByUsername).mockResolvedValue(makeUser({ passwordHash }))
  })

  it('returns 200 with userId, userToken, username on valid credentials', async () => {
    const app = await buildTestApp(userRepo)
    const res = await app.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: { username: 'johndoe', password: 'secret123' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toMatchObject({ userId: 'user-1', username: 'johndoe' })
    expect(typeof body.userToken).toBe('string')
  })

  it('returns 400 when username is missing', async () => {
    const app = await buildTestApp(userRepo)
    const res = await app.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: { password: 'secret123' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 401 when credentials are invalid', async () => {
    vi.mocked(userRepo.findByUsername).mockResolvedValue(null)
    const app = await buildTestApp(userRepo)
    const res = await app.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: { username: 'ghost', password: 'wrong' },
    })
    expect(res.statusCode).toBe(401)
    expect(res.json().error).toBe('Invalid username or password')
  })
})
