import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { RouterLinkStub } from '@vue/test-utils'
import { createTestI18n } from '@/test-utils/i18n'
import HomeView from '../views/HomeView.vue'

const mountHome = () =>
  mount(HomeView, {
    global: { stubs: { RouterLink: RouterLinkStub }, plugins: [createTestI18n()] },
  })

describe('HomeView', () => {
  it('renders without errors', () => {
    const wrapper = mountHome()
    expect(wrapper.exists()).toBe(true)
  })

  it('has a link to /create', () => {
    const wrapper = mountHome()
    const links = wrapper.findAllComponents(RouterLinkStub)
    const createLink = links.find((l) => l.props('to') === '/create')
    expect(createLink).toBeDefined()
  })

  it('has a link to /join', () => {
    const wrapper = mountHome()
    const links = wrapper.findAllComponents(RouterLinkStub)
    const joinLink = links.find((l) => l.props('to') === '/join')
    expect(joinLink).toBeDefined()
  })

  it('displays the app name', () => {
    const wrapper = mountHome()
    expect(wrapper.text()).toContain('BISQNODE')
  })
})
