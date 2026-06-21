import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import { useThemeStore } from '../theme'

let systemDarkMatches = false
let storedTheme: string | null = null

const makeLocalStorageMock = () => ({
  getItem: (key: string) => (key === 'bisqnode-theme' ? storedTheme : null),
  setItem: (_key: string, val: string) => {
    storedTheme = val
  },
  removeItem: (_key: string) => {
    storedTheme = null
  },
})

beforeEach(() => {
  systemDarkMatches = false
  storedTheme = null
  vi.stubGlobal('localStorage', makeLocalStorageMock())
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation(() => ({
      get matches() {
        return systemDarkMatches
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
  setActivePinia(createPinia())
  document.documentElement.classList.remove('dark')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useThemeStore', () => {
  it('defaults to system when nothing stored', () => {
    const store = useThemeStore()
    expect(store.theme).toBe('system')
  })

  it('reads persisted theme from localStorage', () => {
    storedTheme = 'dark'
    const store = useThemeStore()
    expect(store.theme).toBe('dark')
  })

  it('setTheme persists to localStorage', () => {
    const store = useThemeStore()
    store.setTheme('dark')
    expect(storedTheme).toBe('dark')
  })

  it('resolves light when theme is light', () => {
    const store = useThemeStore()
    store.setTheme('light')
    expect(store.resolvedTheme).toBe('light')
  })

  it('resolves dark when theme is dark', () => {
    const store = useThemeStore()
    store.setTheme('dark')
    expect(store.resolvedTheme).toBe('dark')
  })

  it('resolves system to light when system prefers light', () => {
    systemDarkMatches = false
    const store = useThemeStore()
    store.setTheme('system')
    expect(store.resolvedTheme).toBe('light')
  })

  it('resolves system to dark when system prefers dark', () => {
    systemDarkMatches = true
    setActivePinia(createPinia())
    const store = useThemeStore()
    expect(store.resolvedTheme).toBe('dark')
  })

  it('adds .dark class to documentElement when theme resolves to dark', async () => {
    const store = useThemeStore()
    store.setTheme('dark')
    await nextTick()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('removes .dark class from documentElement when theme resolves to light', async () => {
    document.documentElement.classList.add('dark')
    const store = useThemeStore()
    store.setTheme('light')
    await nextTick()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('applies .dark immediately on init when stored theme is dark', async () => {
    storedTheme = 'dark'
    useThemeStore()
    await nextTick()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
