# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> See `CONTRIBUTING.md` for the full architecture guide, conventions, and how-to patterns.

## Commands

```bash
pnpm dev              # Dev server (port 5173)
pnpm build            # Type-check + build
pnpm test:unit        # Vitest unit tests (watch mode)
pnpm test:unit --run  # Run unit tests once
pnpm test:e2e         # Playwright e2e tests (requires dev server running)
pnpm lint             # Oxlint + ESLint (with --fix)
pnpm format           # Oxfmt src/
pnpm type-check       # vue-tsc
```

To run a single test file:
```bash
pnpm test:unit src/features/public/__tests__/useCreateBoard.spec.ts
```

## Architecture

Vue 3 SPA (no Nuxt) part of a monorepo (`bisqnode`). Build tool is Vite.

**Feature-based modular architecture** — each domain feature is self-contained; shared code lives in global folders.

```
src/
  features/            # one folder per domain feature
    <name>/
      components/      # components used only by this feature
      composables/     # composables scoped to this feature
      views/           # route-level page components
      utils/           # pure helpers scoped to this feature
      __tests__/       # unit tests colocated with the feature
      store.ts         # Pinia store for this feature (when needed)
      types.ts         # TypeScript types for this feature
      index.ts         # public barrel — only import features via this file
  components/          # global UI / design system
    ui/                # primitives: AppButton, AppInput, AppBadge…
    layout/            # PublicLayout, PrivateLayout…
    forms/             # FormField, FormLabel, FormError…
    feedback/          # Toast, Modal, Alert, Spinner…
  composables/         # global composables (useDebounce, useMediaQuery…)
  utils/               # global pure utility functions
  stores/              # global Pinia stores: useThemeStore, useSessionStore, useLocaleStore
  services/            # HTTP client (api.ts) and ApiError
  plugins/             # Vue plugin setup — i18n
  locales/             # Translation files: en.ts, pt-BR.ts
  types/               # global TypeScript types and interfaces
  router/              # Vue Router — imports views from features
  test-utils/          # shared helpers for unit tests (e.g. i18n plugin stub)
  assets/styles/       # global CSS: theme variables, base styles
  main.ts
  App.vue
e2e/                   # Playwright specs (baseURL: localhost:5173)
```

**Rules:**
- Features are isolated — no cross-feature direct imports; go through `index.ts`
- Global `components/`, `composables/`, `utils/` are for truly shared code only
- Feature `index.ts` is the public API; internals are private to the feature
- Router imports route-level views from feature `index.ts`
- All HTTP calls go through `src/services/api.ts` — never call `fetch` directly in components or stores

**Import alias:** `@` → `./src`

## Existing Features

| Feature | Path | Routes |
|---------|------|--------|
| `public` | `src/features/public/` | `/`, `/create`, `/join` |
| `board` | `src/features/board/` | `/board/:id`, `/board/:id/kanban`, `/board/:id/calendar`, `/board/:id/chat`, `/board/:id/invite`, `/board/:id/config` |

## Global Stores (`src/stores/`)

| Store | State | Persisted |
|-------|-------|-----------|
| `useThemeStore` | `theme: 'light' \| 'dark' \| 'system'`, `resolvedTheme` | `localStorage` |
| `useSessionStore` | `session: BoardSession \| null` (`boardId`, `memberToken`, `role`) | `localStorage` |
| `useLocaleStore` | `locale: 'en' \| 'pt-BR'` (synced with vue-i18n) | `localStorage` |

## Principles

- **Modular**: features are self-contained; adding or removing one doesn't break others
- **DRY**: extract shared logic to global composables/utils; never duplicate
- **YAGNI**: implement only what the current use case requires; no speculative abstractions
- **Clean Code**: small focused functions, intention-revealing names, no comments for obvious code — document *why*, not *what*

## Code Style

- Formatter: Oxfmt (`semi: false`, `singleQuote: true`)
- Max line length: 100 chars, 2-space indent, LF
- Linting: Oxlint (primary, fast) → ESLint (secondary, full rules)
- TypeScript: strict + `noUncheckedIndexedAccess`, zero `any`
- Vue: `<script setup lang="ts">` only — no Options API, no `defineComponent`

## Testing

- Unit: Vitest + `@vue/test-utils`, jsdom environment
- E2E: Playwright (Chromium/Firefox/WebKit)
- TDD flow: write failing test → implement → green → refactor
- Tests live in `__tests__/` inside each feature folder; global utils/composables tested in their own `__tests__/`
- Use `src/test-utils/i18n.ts` to get an i18n plugin instance for component tests

## Pinia Stores

- Feature stores live in `src/features/<name>/store.ts` — scoped to that feature
- Global stores live in `src/stores/` — app-level concerns only (theme, session, locale)
- All stores use Composition API style (`defineStore` with setup function), not Options API
- Stores are thin: hold state and expose actions; business logic lives in composables or services
- Guard `localStorage` / `window` access with `typeof localStorage !== 'undefined'`
