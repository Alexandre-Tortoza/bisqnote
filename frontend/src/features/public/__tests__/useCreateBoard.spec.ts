import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCreateBoard } from '../composables/useCreateBoard'

vi.mock('@/services/api', () => ({
  api: {
    post: vi.fn().mockResolvedValue({ boardId: 'board-1', memberToken: 'tok', role: 'owner' }),
  },
}))

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
    expect(api.post).toHaveBeenCalledWith('/api/boards', { name: 'My Board', isPrivate: false })
  })

  it('calls setSession with returned data', async () => {
    const { createBoard } = useCreateBoard()
    await createBoard({ name: 'My Board', isPrivate: false })
    expect(mockSetSession).toHaveBeenCalledWith({ boardId: 'board-1', memberToken: 'tok', role: 'owner' })
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

  it('sets error on failure', async () => {
    const { api } = await import('@/services/api')
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Server error'))

    const { createBoard, error } = useCreateBoard()
    await createBoard({ name: 'Board', isPrivate: false })
    expect(error.value).toBeTruthy()
  })
})
