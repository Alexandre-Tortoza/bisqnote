import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCreateBoard } from '../composables/useCreateBoard'
import { ApiError } from '@/services/ApiError'

vi.mock('@/services/api', () => ({
  api: {
    post: vi.fn().mockResolvedValue({ boardId: 'board-1', memberToken: 'tok', role: 'owner' }),
  },
}))

vi.mock('@/utils/crypto', () => ({
  deriveBoardKey: vi.fn().mockResolvedValue({}),
  exportKeyAsBase64: vi.fn().mockResolvedValue('base64key=='),
}))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

const mockSetSession = vi.fn()
const mockPush = vi.fn()

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({ setSession: mockSetSession }),
}))



vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

describe('useCreateBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls api.post with payload', async () => {
    const { api } = await import('@/services/api')
    const { createBoard } = useCreateBoard()
    await createBoard({ name: 'My Board', isPrivate: false })
    expect(api.post).toHaveBeenCalledWith('/api/boards', expect.objectContaining({ name: 'My Board', isPrivate: false }))
  })

  it('calls setSession with returned data and board key', async () => {
    const { createBoard } = useCreateBoard()
    await createBoard({ name: 'My Board', isPrivate: false })
    expect(mockSetSession).toHaveBeenCalledWith({
      boardId: 'board-1',
      boardName: 'My Board',
      memberToken: 'tok',
      role: 'owner',
      boardKey: 'base64key==',
    })
  })

  it('navigates to /board/:id after success', async () => {
    const { createBoard } = useCreateBoard()
    await createBoard({ name: 'My Board', isPrivate: false })
    expect(mockPush).toHaveBeenCalledWith('/board/board-1')
  })

  it('toggles loading during request', async () => {
    const { api } = await import('@/services/api')
    let resolvePost!: (v: unknown) => void
    vi.mocked(api.post).mockReturnValueOnce(new Promise((r) => { resolvePost = r }))

    const { createBoard, loading } = useCreateBoard()
    const promise = createBoard({ name: 'Board', isPrivate: false })
    expect(loading.value).toBe(true)
    resolvePost({ boardId: 'x', memberToken: 'y', role: 'owner' })
    await promise
    expect(loading.value).toBe(false)
  })

  it('shows i18n serverError key on 500', async () => {
    const { api } = await import('@/services/api')
    vi.mocked(api.post).mockRejectedValueOnce(new ApiError(500, 'Internal server error'))

    const { createBoard, error } = useCreateBoard()
    await createBoard({ name: 'Board', isPrivate: false })
    expect(error.value).toBe('errors.serverError')
  })

  it('shows backend message on 400', async () => {
    const { api } = await import('@/services/api')
    vi.mocked(api.post).mockRejectedValueOnce(new ApiError(400, 'Password required for private boards'))

    const { createBoard, error } = useCreateBoard()
    await createBoard({ name: 'Board', isPrivate: false })
    expect(error.value).toBe('Password required for private boards')
  })

  it('shows i18n unknown key for non-ApiError', async () => {
    const { api } = await import('@/services/api')
    vi.mocked(api.post).mockRejectedValueOnce(new Error('network failure'))

    const { createBoard, error } = useCreateBoard()
    await createBoard({ name: 'Board', isPrivate: false })
    expect(error.value).toBe('errors.createBoard.unknown')
  })
})
