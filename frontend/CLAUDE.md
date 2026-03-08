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
pnpm test:unit src/__tests__/MyComponent.spec.ts
```

## Architecture

Vue 3 SPA (no Nuxt) part of a monorepo (`bisqnode`). Build tool is Vite.

**Clean Architecture** — code is organized by domain/feature, with strict layer separation:

```
src/
  domain/            # Pure business logic: entities, value objects, interfaces
  application/       # Use cases (interactors): orchestrate domain, no framework deps
  infrastructure/    # External adapters: API clients, localStorage, HTTP
  presentation/      # Vue layer: components, composables, stores, router, views
  main.ts            # Composition root: wires all layers together
  App.vue
e2e/                 # Playwright specs (baseURL: localhost:5173)
```

**Dependency rule:** `presentation` → `application` → `domain`. Infrastructure implements interfaces defined in domain/application. No layer imports from a higher one.

**Modules:** each feature lives in its own folder across layers (e.g. `domain/order/`, `application/order/`, `presentation/order/`). No cross-feature imports — go through use cases.

**Import alias:** `@` → `./src`

## Principles

- **Clean Architecture**: layers are isolated; domain has zero framework dependencies
- **Modular**: features are self-contained; adding or removing one doesn't break others
- **DRY**: extract shared logic to composables (presentation) or services (application); never duplicate business rules
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
- Domain and application layers must have 100% unit test coverage; infrastructure is integration-tested

## Pinia Stores

Stores live in `presentation/` and are thin: they call application use cases, hold UI state, and do not contain business logic. Use Composition API style (`defineStore` with a setup function), not Options API.
