import { createI18n } from 'vue-i18n'
import en from '@/locales/en'
import ptBR from '@/locales/pt-BR'

function detectLocale(): string {
  const supported = ['pt-BR', 'pt', 'en']
  const languages = navigator.languages?.length ? [...navigator.languages] : [navigator.language]

  for (const lang of languages) {
    if (supported.includes(lang)) return lang
    // match region-less: "pt-PT" → "pt" → resolves to pt-BR
    const base = lang.split('-')[0]
    if (supported.includes(base)) return base
  }
  return 'en'
}

const locale = detectLocale()

export const i18n = createI18n({
  legacy: false,
  locale: locale === 'pt' ? 'pt-BR' : locale,
  fallbackLocale: 'en',
  messages: {
    en,
    'pt-BR': ptBR,
  },
})
