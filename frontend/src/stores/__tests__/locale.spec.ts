import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'

const mockLocale = ref<string>('en')

vi.mock('@/plugins/i18n', () => ({
  i18n: { global: { locale: mockLocale } },
}))

let storedLocale: string | null = null

beforeEach(() => {
  storedLocale = null
  mockLocale.value = 'en'
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (key === 'bisqnode-locale' ? storedLocale : null),
    setItem: (_: string, val: string) => {
      storedLocale = val
    },
    removeItem: (_: string) => {
      storedLocale = null
    },
  })
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useLocaleStore', () => {
  it('reads initial locale from i18n', async () => {
    mockLocale.value = 'pt-BR'
    const { useLocaleStore } = await import('../locale')
    const store = useLocaleStore()
    expect(store.locale).toBe('pt-BR')
  })

  it('setLocale updates i18n global locale', async () => {
    const { useLocaleStore } = await import('../locale')
    const store = useLocaleStore()
    store.setLocale('pt-BR')
    expect(mockLocale.value).toBe('pt-BR')
  })

  it('setLocale persists to localStorage', async () => {
    const { useLocaleStore } = await import('../locale')
    const store = useLocaleStore()
    store.setLocale('pt-BR')
    expect(storedLocale).toBe('pt-BR')
  })

  it('setLocale updates store locale', async () => {
    const { useLocaleStore } = await import('../locale')
    const store = useLocaleStore()
    store.setLocale('pt-BR')
    expect(store.locale).toBe('pt-BR')
  })
})
