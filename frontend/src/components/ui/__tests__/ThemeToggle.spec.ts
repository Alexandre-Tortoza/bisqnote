import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createTestI18n } from '@/test-utils/i18n'

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })))
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
  })
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function mountToggle() {
  const { default: ThemeToggle } = await import('../ThemeToggle.vue')
  return mount(ThemeToggle, { global: { plugins: [createTestI18n()] } })
}

describe('ThemeToggle', () => {
  it('renders a single button', async () => {
    const wrapper = await mountToggle()
    expect(wrapper.findAll('button')).toHaveLength(1)
  })

  it('cycles from system to dark on click', async () => {
    const wrapper = await mountToggle()
    const { useThemeStore } = await import('@/stores/theme')
    const store = useThemeStore()
    expect(store.theme).toBe('system')
    await wrapper.find('button').trigger('click')
    expect(store.theme).toBe('dark')
  })

  it('cycles from dark to light on click', async () => {
    const wrapper = await mountToggle()
    const { useThemeStore } = await import('@/stores/theme')
    const store = useThemeStore()
    store.setTheme('dark')
    await wrapper.find('button').trigger('click')
    expect(store.theme).toBe('light')
  })

  it('cycles from light to system on click', async () => {
    const wrapper = await mountToggle()
    const { useThemeStore } = await import('@/stores/theme')
    const store = useThemeStore()
    store.setTheme('light')
    await wrapper.find('button').trigger('click')
    expect(store.theme).toBe('system')
  })
})
