import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createTestI18n } from '@/test-utils/i18n'
import { ref } from 'vue'

const mockLocale = ref<string>('en')

vi.mock('@/plugins/i18n', () => ({
  i18n: { global: { locale: mockLocale } },
}))

vi.stubGlobal('localStorage', {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
})

beforeEach(() => {
  mockLocale.value = 'en'
  setActivePinia(createPinia())
})

async function mountToggle() {
  const { default: LocaleToggle } = await import('../LocaleToggle.vue')
  return mount(LocaleToggle, { global: { plugins: [createTestI18n()] }, attachTo: document.body })
}

describe('LocaleToggle', () => {
  it('renders a trigger button', async () => {
    const wrapper = await mountToggle()
    expect(wrapper.find('[data-trigger]').exists()).toBe(true)
  })

  it('dropdown is closed initially', async () => {
    const wrapper = await mountToggle()
    expect(wrapper.find('[data-dropdown]').exists()).toBe(false)
  })

  it('opens dropdown on trigger click', async () => {
    const wrapper = await mountToggle()
    await wrapper.find('[data-trigger]').trigger('click')
    expect(wrapper.find('[data-dropdown]').exists()).toBe(true)
  })

  it('shows EN and PT-BR options in dropdown', async () => {
    const wrapper = await mountToggle()
    await wrapper.find('[data-trigger]').trigger('click')
    const options = wrapper.findAll('[data-option]')
    expect(options).toHaveLength(2)
  })

  it('clicking an option calls setLocale and closes dropdown', async () => {
    const wrapper = await mountToggle()
    await wrapper.find('[data-trigger]').trigger('click')
    const options = wrapper.findAll('[data-option]')
    await options[1]!.trigger('click') // pt-BR
    expect(mockLocale.value).toBe('pt-BR')
    expect(wrapper.find('[data-dropdown]').exists()).toBe(false)
  })
})
