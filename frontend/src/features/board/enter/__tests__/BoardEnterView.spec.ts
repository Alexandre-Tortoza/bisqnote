import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createTestI18n } from '@/test-utils/i18n'
import BoardEnterView from '../views/BoardEnterView.vue'

const mockGetBoardMeta = vi.fn()
const mockJoinBoard = vi.fn()
const mockLoadingJoin = ref(false)
const mockErrorJoin = ref<string | null>(null)

vi.mock('@/features/public', () => ({
  useJoinBoard: () => ({
    getBoardMeta: mockGetBoardMeta,
    joinBoard: mockJoinBoard,
    loading: mockLoadingJoin,
    error: mockErrorJoin,
  }),
  UserAuthStep: { name: 'UserAuthStep', template: '<div data-testid="user-auth-step" />' },
}))

const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'board-1' } }),
  useRouter: () => ({ push: mockPush }),
}))

let mockUser: { username: string } | null = { username: 'testuser' }
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ user: mockUser }),
}))

const mountView = () =>
  mount(BoardEnterView, {
    global: { plugins: [createTestI18n()] },
  })

describe('BoardEnterView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = { username: 'testuser' }
    mockLoadingJoin.value = false
    mockErrorJoin.value = null
    mockGetBoardMeta.mockResolvedValue({ isPrivate: false, name: 'My Board' })
    mockJoinBoard.mockResolvedValue(undefined)
  })

  it('shows loading state while fetching board meta', () => {
    mockGetBoardMeta.mockReturnValue(new Promise(() => {}))
    const wrapper = mountView()
    expect(wrapper.text()).toContain('Connecting')
  })

  it('shows not-found state when getBoardMeta returns null', async () => {
    mockGetBoardMeta.mockResolvedValue(null)
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('BOARD NOT FOUND')
  })

  it('shows not-found description', async () => {
    mockGetBoardMeta.mockResolvedValue(null)
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('does not exist')
  })

  it('shows UserAuthStep when user is not authenticated', async () => {
    mockUser = null
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.find('[data-testid="user-auth-step"]').exists()).toBe(true)
  })

  it('shows the enter form when user is authenticated', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('shows board name in the enter form', async () => {
    mockGetBoardMeta.mockResolvedValue({ isPrivate: false, name: 'Alpha Team' })
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('Alpha Team')
  })

  it('does not show password field for public board', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.find('input[name="password"]').exists()).toBe(false)
  })

  it('shows password field for private board', async () => {
    mockGetBoardMeta.mockResolvedValue({ isPrivate: true, name: 'Secret Board' })
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.find('input[name="password"]').exists()).toBe(true)
  })

  it('calls joinBoard without password for public board', async () => {
    const wrapper = mountView()
    await flushPromises()
    await wrapper.find('form').trigger('submit')
    expect(mockJoinBoard).toHaveBeenCalledWith('board-1', 'My Board', undefined)
  })

  it('calls joinBoard with password for private board', async () => {
    mockGetBoardMeta.mockResolvedValue({ isPrivate: true, name: 'Secret' })
    const wrapper = mountView()
    await flushPromises()
    await wrapper.find('input[name="password"]').setValue('mypassword')
    await wrapper.find('form').trigger('submit')
    expect(mockJoinBoard).toHaveBeenCalledWith('board-1', 'Secret', 'mypassword')
  })

  it('shows validation error and does not submit when private board password is empty', async () => {
    mockGetBoardMeta.mockResolvedValue({ isPrivate: true, name: 'Secret' })
    const wrapper = mountView()
    await flushPromises()
    await wrapper.find('form').trigger('submit')
    expect(mockJoinBoard).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('required')
  })

  it('shows join error from composable', async () => {
    const wrapper = mountView()
    await flushPromises()
    mockErrorJoin.value = 'Wrong password'
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Wrong password')
  })

  it('navigates to / when back-home button is clicked in not-found state', async () => {
    mockGetBoardMeta.mockResolvedValue(null)
    const wrapper = mountView()
    await flushPromises()
    await wrapper.find('button[data-testid="back-home-btn"]').trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('navigates to / when back button is clicked in enter form', async () => {
    const wrapper = mountView()
    await flushPromises()
    await wrapper.find('button[data-testid="back-btn"]').trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/')
  })
})
