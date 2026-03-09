import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { RouterLinkStub } from '@vue/test-utils'
import { createTestI18n } from '@/test-utils/i18n'
import JoinView from '../views/JoinView.vue'

const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  RouterLink: RouterLinkStub,
}))

const mountJoin = () =>
  mount(JoinView, {
    global: { stubs: { RouterLink: RouterLinkStub }, plugins: [createTestI18n()] },
  })

describe('JoinView', () => {
  it('renders a form', () => {
    const wrapper = mountJoin()
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('shows a board ID input', () => {
    const wrapper = mountJoin()
    expect(wrapper.find('input[name="boardId"]').exists()).toBe(true)
  })

  it('shows validation error when submitted with empty board ID', async () => {
    const wrapper = mountJoin()
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('required')
  })

  it('does not show an error before first submission', () => {
    const wrapper = mountJoin()
    expect(wrapper.find('[data-testid="boardId-error"]').exists()).toBe(false)
  })

  it('navigates to board-enter when submitting a plain UUID', async () => {
    const wrapper = mountJoin()
    await wrapper.find('input[name="boardId"]').setValue('some-uuid-1234')
    await wrapper.find('form').trigger('submit')
    expect(mockPush).toHaveBeenCalledWith({ name: 'board-enter', params: { id: 'some-uuid-1234' } })
  })

  it('extracts UUID from a full URL before navigating', async () => {
    const wrapper = mountJoin()
    await wrapper.find('input[name="boardId"]').setValue('http://localhost:5173/board/abc-uuid-xyz')
    await wrapper.find('form').trigger('submit')
    expect(mockPush).toHaveBeenCalledWith({ name: 'board-enter', params: { id: 'abc-uuid-xyz' } })
  })
})
