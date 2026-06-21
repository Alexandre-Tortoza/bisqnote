import { createI18n } from 'vue-i18n'
import en from '@/locales/en'
import ptBR from '@/locales/pt-BR'

function detectLocale(): string {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('bisqnode-locale')
    if (stored === 'en' || stored === 'pt-BR') return stored
  }

  const supported = ['pt-BR', 'pt', 'en']
  const languages =
    typeof navigator !== 'undefined'
      ? navigator.languages?.length
        ? [...navigator.languages]
        : [navigator.language]
      : []

  for (const lang of languages) {
    if (supported.includes(lang)) return lang
    // match region-less: "pt-PT" → "pt" → resolves to pt-BR
    const base = lang.split('-')[0] ?? ''
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
