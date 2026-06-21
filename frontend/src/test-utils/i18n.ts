import { createI18n } from 'vue-i18n'
import en from '@/locales/en'
import ptBR from '@/locales/pt-BR'

export function createTestI18n(locale = 'en') {
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    messages: { en, 'pt-BR': ptBR },
  })
}
