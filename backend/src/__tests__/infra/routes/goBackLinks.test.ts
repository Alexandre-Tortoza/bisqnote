import { describe, it, expect, vi } from 'vitest'
import Fastify from 'fastify'
import fp from 'fastify-plugin'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IGoBackLinkRepository } from '../../../domain/repositories/IGoBackLinkRepository.js'
import { goBackLinkRoutes } from '../../../infra/http/routes/goBackLinks.js'

async function buildTestApp(goBackLinkRepo: IGoBackLinkRepository, memberRepo: IMemberRepository) {
  const app = Fastify()

  const mockPlugin = fp(async (fastify) => {
    fastify.decorate('db', {} as never)
  })

  await app.register(mockPlugin)
  await app.register(goBackLinkRoutes, { goBackLinkRepo, memberRepo })

  return app
}

describe('GET /api/go-back/:token', () => {
  const validMember = {
    id: 'member-1',
    boardId: 'board-1',
    tokenHash: 'hash',
    role: 'owner' as const,
    encryptedContent: '{}',
  }

  const validLink = {
    id: 'link-1',
    boardId: 'board-1',
    memberId: 'member-1',
    token: 'valid-token',
    expiresAt: new Date(Date.now() + 60_000),
    usedAt: null,
  }

  it('returns 200 with session data on valid token', async () => {
    const goBackLinkRepo: IGoBackLinkRepository = {
      create: vi.fn(),
      findByToken: vi.fn().mockResolvedValue(validLink),
      markUsed: vi.fn().mockResolvedValue(undefined),
    }
    const memberRepo: IMemberRepository = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(validMember),
      updateTokenHash: vi.fn().mockResolvedValue(undefined),
    }

    const app = await buildTestApp(goBackLinkRepo, memberRepo)
    const res = await app.inject({ method: 'GET', url: '/api/go-back/valid-token' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toMatchObject({ boardId: 'board-1', role: 'owner' })
    expect(typeof body.memberToken).toBe('string')
  })

  it('returns 404 on invalid/expired token', async () => {
    const goBackLinkRepo: IGoBackLinkRepository = {
      create: vi.fn(),
      findByToken: vi.fn().mockResolvedValue(null),
      markUsed: vi.fn(),
    }
    const memberRepo: IMemberRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      updateTokenHash: vi.fn(),
    }

    const app = await buildTestApp(goBackLinkRepo, memberRepo)
    const res = await app.inject({ method: 'GET', url: '/api/go-back/bad-token' })

    expect(res.statusCode).toBe(404)
  })
})
