import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { RouterLinkStub } from '@vue/test-utils'
import JoinView from '../views/JoinView.vue'

const mountJoin = () =>
  mount(JoinView, {
    global: { stubs: { RouterLink: RouterLinkStub } },
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

  it('shows password field when board is private', async () => {
    const wrapper = mountJoin()
    expect(wrapper.find('input[name="password"]').exists()).toBe(false)
    await wrapper.find('input[name="isPrivate"]').setValue(true)
    expect(wrapper.find('input[name="password"]').exists()).toBe(true)
  })
})
