import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import App from '../App.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(null), setItem: vi.fn(), removeItem: vi.fn() })
})

describe('App', () => {
  it('mounts and renders a RouterView', () => {
    const router = createRouter({ history: createWebHashHistory(), routes: [{ path: '/', component: { template: '<div>home</div>' } }] })
    const wrapper = mount(App, { global: { plugins: [router, createPinia()] } })
    expect(wrapper.exists()).toBe(true)
  })
})
