# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Dev server (port 5173)
pnpm build            # Type-check + build
pnpm test:unit        # Vitest unit tests (watch mode)
pnpm test:unit --run  # Run unit tests once
pnpm test:e2e         # Playwright e2e tests
pnpm lint             # Oxlint + ESLint (with --fix)
pnpm format           # Oxfmt src/
pnpm type-check       # vue-tsc
```

To run a single test file:
```bash
pnpm test:unit src/features/auth/__tests__/useAuth.spec.ts
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
      utils/           # pure helpers scoped to this feature
      __tests__/       # unit tests colocated with the feature
      store.ts         # Pinia store for this feature
      types.ts         # TypeScript types for this feature
      index.ts         # public barrel — only import features via this file
  components/          # global UI / design system
    ui/                # primitives: Button, Input, Badge, Icon…
    layout/            # Header, Sidebar, Container, PageWrapper…
    forms/             # FormField, FormLabel, FormError…
    feedback/          # Toast, Modal, Alert, Spinner…
  composables/         # global composables (useDebounce, useMediaQuery…)
  utils/               # global pure utility functions
  stores/              # global Pinia stores (app-level state, e.g. theme, session)
  types/               # global TypeScript types and interfaces
  router/              # Vue Router — imports views from features
  assets/
  main.ts
  App.vue
e2e/                   # Playwright specs (baseURL: localhost:5173)
```

**Rules:**
- Features are isolated — no cross-feature direct imports; go through `index.ts`
- Global `components/`, `composables/`, `utils/` are for truly shared code only
- Feature `index.ts` is the public API; internals are private to the feature
- Router imports route-level views from feature `index.ts`

**Import alias:** `@` → `./src`

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

## Testing

- Unit: Vitest + `@vue/test-utils`, jsdom environment
- E2E: Playwright (Chromium/Firefox/WebKit), auto-starts dev server
- TDD flow: write failing test → implement → green → refactor
- Tests live in `__tests__/` inside each feature folder; global utils/composables tested in their own `__tests__/`

## Pinia Stores

- Feature stores live in `src/features/<name>/store.ts` — scoped to that feature
- Global stores live in `src/stores/` — app-level concerns only (e.g. auth session, theme)
- All stores use Composition API style (`defineStore` with setup function), not Options API
- Stores are thin: hold UI/domain state and call composables or services; no raw business logic
