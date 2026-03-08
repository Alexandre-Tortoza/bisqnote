import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { RouterLinkStub } from '@vue/test-utils'
import { createTestI18n } from '@/test-utils/i18n'
import CreateView from '../views/CreateView.vue'

const mountCreate = () =>
  mount(CreateView, {
    global: { stubs: { RouterLink: RouterLinkStub }, plugins: [createTestI18n()] },
  })

describe('CreateView', () => {
  it('renders a form', () => {
    const wrapper = mountCreate()
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('shows a board name input', () => {
    const wrapper = mountCreate()
    const nameInput = wrapper.find('input[name="name"]')
    expect(nameInput.exists()).toBe(true)
  })

  it('shows a validation error when submitted with empty name', async () => {
    const wrapper = mountCreate()
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('required')
  })

  it('does not show an error before first submission', () => {
    const wrapper = mountCreate()
    expect(wrapper.find('[data-testid="name-error"]').exists()).toBe(false)
  })

  it('clears the name error when name is filled', async () => {
    const wrapper = mountCreate()
    await wrapper.find('form').trigger('submit')
    await wrapper.find('input[name="name"]').setValue('My Board')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.find('[data-testid="name-error"]').exists()).toBe(false)
  })

  it('toggles private password field', async () => {
    const wrapper = mountCreate()
    expect(wrapper.find('input[name="password"]').exists()).toBe(false)
    await wrapper.find('input[name="isPrivate"]').setValue(true)
    expect(wrapper.find('input[name="password"]').exists()).toBe(true)
  })
})
