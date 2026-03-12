# Contributing Guide

This document covers architecture, conventions, and workflows for contributing to the **bisqnode** frontend.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Getting Started](#getting-started)
4. [Architecture](#architecture)
5. [Adding a New Feature](#adding-a-new-feature)
6. [Components](#components)
7. [Pinia Stores](#pinia-stores)
8. [API Layer](#api-layer)
9. [Internationalisation (i18n)](#internationalisation-i18n)
10. [Testing](#testing)
11. [Code Style & Conventions](#code-style--conventions)
12. [Git Conventions](#git-conventions)

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| [Vue 3](https://vuejs.org/) | UI framework — Composition API only |
| [Vite](https://vitejs.dev/) | Build tool & dev server |
| [TypeScript](https://www.typescriptlang.org/) | Strict mode + `noUncheckedIndexedAccess` |
| [Pinia](https://pinia.vuejs.org/) | State management |
| [Vue Router 5](https://router.vuejs.org/) | Client-side routing |
| [vue-i18n 11](https://vue-i18n.intlify.dev/) | Internationalisation |
| [Tailwind CSS 4](https://tailwindcss.com/) | Utility-first styling |
| [Vitest](https://vitest.dev/) | Unit & component tests |
| [Playwright](https://playwright.dev/) | End-to-end tests |
| [Oxlint](https://oxc.rs/docs/guide/usage/linter) + [ESLint](https://eslint.org/) | Linting (dual-pass) |
| [Oxfmt](https://github.com/oxc-project/oxc) | Formatting |
| pnpm | Package manager |

---

## Project Structure

```
src/
├── features/            # One folder per domain feature (self-contained)
│   ├── public/          # Unauthenticated pages: home, create, join
│   │   ├── components/
│   │   ├── composables/
│   │   ├── views/
│   │   ├── __tests__/
│   │   └── index.ts
│   │
│   └── board/           # Board domain — split into sub-features
│       ├── enter/       # Sub-feature: board entry / password verification
│       ├── home/        # Sub-feature: board home dashboard
│       ├── kanban/      # Sub-feature: kanban view
│       ├── calendar/    # Sub-feature: calendar view
│       ├── chat/        # Sub-feature: real-time chat
│       ├── invite/      # Sub-feature: invite members
│       ├── config/      # Sub-feature: board settings
│       └── index.ts     # Aggregates all sub-feature barrels
│
│   Each sub-feature follows the same structure as a top-level feature:
│       ├── components/  # Components used only inside this sub-feature
│       ├── composables/ # Composables scoped to this sub-feature
│       ├── views/       # Route-level page components
│       ├── __tests__/   # Unit tests for this sub-feature
│       ├── store.ts     # Pinia store (when needed)
│       ├── types.ts     # TypeScript types local to this sub-feature
│       └── index.ts     # Public barrel — consumed by board/index.ts
│
├── components/          # Shared, reusable components
│   ├── ui/              # Primitives: Button, Input, Badge, Icon…
│   ├── layout/          # Structural shells: PublicLayout, PrivateLayout…
│   ├── forms/           # Form helpers: FormField, FormLabel, FormError…
│   └── feedback/        # Toast, Modal, Alert, Spinner…
│
├── composables/         # Global composables (useDebounce, useMediaQuery…)
├── utils/               # Pure utility functions with no Vue dependencies
├── stores/              # App-level Pinia stores (theme, session, locale)
├── services/            # HTTP client and error types
├── plugins/             # Vue plugin setup (i18n, etc.)
├── locales/             # Translation files (en.ts, pt-BR.ts)
├── router/              # Vue Router config
├── types/               # Global TypeScript types
├── assets/styles/       # Global CSS (theme variables, base styles)
├── test-utils/          # Shared test helpers
├── App.vue
└── main.ts
```

**The golden rule:** features are isolated. Cross-feature imports are forbidden — use `index.ts` barrels and go through the public API only.

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Start the dev server (http://localhost:5173)
pnpm dev

# Run unit tests in watch mode
pnpm test:unit

# Run unit tests once (CI)
pnpm test:unit --run

# Type-check
pnpm type-check

# Lint + fix
pnpm lint

# Format
pnpm format

# Build
pnpm build
```

> E2E tests require the dev server (or preview) to be running:
> ```bash
> pnpm dev &
> pnpm test:e2e
> ```

---

## Architecture

### Feature-based Modules

Each domain concern lives in its own folder under `src/features/`. The folder exposes a single `index.ts` barrel; nothing outside the feature should import its internals directly.

```
// ✅ correct — import through the barrel
import { CreateView } from '@/features/public'

// ❌ wrong — bypasses the public API
import CreateView from '@/features/public/views/CreateView.vue'
```

### Layouts

The router wraps routes in a layout component. Two layouts exist:

- **`PublicLayout`** — unauthenticated pages (home, create, join).
- **`PrivateLayout`** — board pages protected by `requiresAuth: true` meta.

Route guards in `src/router/index.ts` check `useSessionStore().hasSession(boardId)` and redirect to `home` when the session is missing.

### Global State

App-level state lives in `src/stores/`:

| Store | Responsibility |
|-------|---------------|
| `useThemeStore` | `light` / `dark` / `system` theme, persisted to `localStorage` |
| `useLocaleStore` | Active locale (`en` / `pt-BR`), synced with vue-i18n |
| `useSessionStore` | Board session (`boardId`, `memberToken`, `role`), persisted to `localStorage` |

Feature stores live inside their own feature folder (`src/features/<name>/store.ts`) and are not imported by other features.

---

## Adding a New Feature

### Top-level feature (new domain, e.g. `profile`)

#### 1. Create the folder scaffold

```
src/features/<name>/
  views/
  components/      (add if needed)
  composables/     (add if needed)
  __tests__/
  index.ts
```

#### 2. Create the barrel (`index.ts`)

Export only what outside consumers need:

```ts
// src/features/profile/index.ts
export { default as ProfileView } from './views/ProfileView.vue'
export { useProfile } from './composables/useProfile'
```

#### 3. Register routes

Add the new routes to `src/router/index.ts`, importing views via the lazy-import path:

```ts
{
  path: '/profile',
  name: 'profile',
  component: () => import('@/features/profile/views/ProfileView.vue'),
}
```

---

### Board sub-feature (new section within `/board/:id`)

The `board` feature is too large to stay flat, so it is split into sub-features.
Each sub-feature is a self-contained module — the same rules apply as for a top-level feature.

#### 1. Create the sub-feature scaffold

```
src/features/board/<sub>/
  views/
  components/      (add if needed)
  composables/     (add if needed)
  __tests__/
  index.ts         ← barrel for this sub-feature
```

#### 2. Export from the sub-feature barrel

```ts
// src/features/board/kanban/index.ts
export { default as BoardKanbanView } from './views/BoardKanbanView.vue'
export { useKanban } from './composables/useKanban'
```

#### 3. Re-export from the board barrel

```ts
// src/features/board/index.ts  (add one line)
export { BoardKanbanView, useKanban } from './kanban'
```

#### 4. Register routes (lazy import by path)

```ts
// src/router/index.ts
{
  path: 'kanban',
  name: 'board-kanban',
  component: () => import('@/features/board/kanban/views/BoardKanbanView.vue'),
}
```

### 4. Write tests first (TDD)

Create `src/features/<name>/__tests__/<Name>.spec.ts` before writing the component or composable. See the [Testing](#testing) section.

### 5. Add translations

Add any new user-facing strings to both locale files:

```ts
// src/locales/en.ts
profile: {
  title: 'Profile',
  save: 'Save changes',
}

// src/locales/pt-BR.ts
profile: {
  title: 'Perfil',
  save: 'Salvar alterações',
}
```

---

## Components

### Global UI primitives (`src/components/ui/`)

Always prefer existing primitives over writing raw HTML elements:

```vue
<AppButton variant="primary" size="md" @click="submit">Save</AppButton>
<AppInput v-model="name" placeholder="Board name" />
<AppBadge>Owner</AppBadge>
```

**Available variants for `AppButton`:** `primary` | `secondary` | `ghost` | `danger`  
**Available sizes:** `sm` | `md` | `lg`

### Writing a new component

- Use `<script setup lang="ts">` — no Options API.
- Define props with `defineProps<{...}>()` and defaults with `withDefaults`.
- Use Tailwind utility classes; avoid inline styles.
- Keep components focused — if a component exceeds ~150 lines, split it.

```vue
<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string
    count?: number
  }>(),
  { count: 0 },
)
</script>

<template>
  <div class="flex items-center gap-2">
    <span>{{ label }}</span>
    <AppBadge>{{ count }}</AppBadge>
  </div>
</template>
```

### Naming conventions

| What | Convention | Example |
|------|-----------|---------|
| Global UI component | `App` prefix | `AppButton.vue` |
| Layout component | `Layout` suffix | `PrivateLayout.vue` |
| Feature view | `View` suffix | `BoardKanbanView.vue` |
| Feature component | Descriptive, no prefix | `TaskCard.vue` |

---

## Pinia Stores

All stores use the **Composition API style** (`defineStore` with a setup function). Options API stores are not allowed.

```ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const doubled = computed(() => count.value * 2)

  function increment() {
    count.value++
  }

  return { count, doubled, increment }
})
```

**Rules:**
- Stores are thin — they hold state and expose actions; business logic lives in composables or services.
- Persist to `localStorage` manually when the state must survive a page refresh (see `useThemeStore` for the pattern).
- Always guard `localStorage` / `window` access with `typeof localStorage !== 'undefined'` for SSR-safety.
- Feature stores go in `src/features/<name>/store.ts`; app-level stores go in `src/stores/`.

---

## API Layer

All HTTP calls go through `src/services/api.ts`:

```ts
import { api } from '@/services/api'

// POST
const result = await api.post<ResponseType>('/api/endpoint', payload)

// GET
const data = await api.get<ResponseType>('/api/endpoint')
```

The base URL defaults to `http://localhost:3000` and can be overridden via the `VITE_API_URL` environment variable.

On non-2xx responses, `api` throws a plain `Error`. Use `ApiError` from `src/services/ApiError.ts` if you need to carry the HTTP status code:

```ts
import { ApiError } from '@/services/ApiError'

throw new ApiError(404, 'Board not found')
```

**Never call `fetch` directly in a component or store.** Always route through `api` or an abstraction built on top of it.

---

## Internationalisation (i18n)

The app supports English (`en`) and Brazilian Portuguese (`pt-BR`). Locale is auto-detected from the browser and persisted to `localStorage`.

### Using translations in components

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<template>
  <h1>{{ t('home.title') }}</h1>
  <p>{{ t('home.description') }}</p>
</template>
```

### Adding a new string

Add the key to **both** locale files at the same time:

```ts
// src/locales/en.ts
export default {
  home: {
    title: 'Welcome',
    newKey: 'My new string',   // ← add here
  },
}

// src/locales/pt-BR.ts
export default {
  home: {
    title: 'Bem-vindo',
    newKey: 'Minha nova string',  // ← and here
  },
}
```

Switching locale at runtime:

```ts
import { useLocaleStore } from '@/stores/locale'
const localeStore = useLocaleStore()
localeStore.setLocale('pt-BR')
```

---

## Testing

### Philosophy — TDD is mandatory

1. Write a **failing test** first.
2. Implement the minimum code to make it pass.
3. Refactor.

Never write production code without a failing test backing it.

### Unit tests (Vitest)

Test files live in `__tests__/` inside the relevant folder, colocated with the code they test.

```
src/features/public/__tests__/useCreateBoard.spec.ts
src/stores/__tests__/theme.spec.ts
src/components/ui/__tests__/AppButton.spec.ts
```

Run a single file:

```bash
pnpm test:unit src/features/public/__tests__/useCreateBoard.spec.ts
```

#### Composable test pattern

Mock external dependencies (`api`, stores, router) at the top of the file:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useMyComposable } from '../composables/useMyComposable'

vi.mock('@/services/api', () => ({
  api: { post: vi.fn().mockResolvedValue({ id: '1' }) },
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({ setSession: vi.fn() }),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('useMyComposable', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does the thing', async () => {
    const { doThing } = useMyComposable()
    await doThing()
    // assert...
  })
})
```

#### Store test pattern

Always create a fresh Pinia before each test and stub browser globals:

```ts
import { setActivePinia, createPinia } from 'pinia'
import { vi, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  vi.stubGlobal('localStorage', { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() })
  setActivePinia(createPinia())
})

afterEach(() => vi.unstubAllGlobals())
```

#### i18n in component tests

Use the helper from `src/test-utils/i18n.ts` to mount components with i18n support:

```ts
import { mount } from '@vue/test-utils'
import { i18nPlugin } from '@/test-utils/i18n'
import MyComponent from '../MyComponent.vue'

const wrapper = mount(MyComponent, {
  global: { plugins: [i18nPlugin] },
})
```

### E2E tests (Playwright)

E2E specs live in `e2e/`. They run against the dev server (`localhost:5173`).

```bash
pnpm dev &        # start dev server first
pnpm test:e2e
```

---

## Code Style & Conventions

### TypeScript

- Strict mode is on — no `any`, no type assertions without justification.
- `noUncheckedIndexedAccess` is enabled — always guard array/object access.
- Prefer `interface` for object shapes, `type` for unions and aliases.

### Vue

- `<script setup lang="ts">` everywhere — no `defineComponent`, no Options API.
- `v-bind="$attrs"` on the root element of pass-through wrapper components.
- Computed properties for derived data; avoid heavy logic in templates.

### Formatting

- Formatter: Oxfmt — `semi: false`, `singleQuote: true`.
- Max line length: 100 characters, 2-space indent, LF line endings.
- Run `pnpm format` before committing.

### Linting

Two linters run in sequence:

1. **Oxlint** — fast, handles most rules.
2. **ESLint** — catches what Oxlint misses (Vue-specific, Playwright, Vitest rules).

```bash
pnpm lint   # runs both with --fix
```

### Import alias

Use `@` for all imports from `src/`:

```ts
// ✅
import { api } from '@/services/api'

// ❌
import { api } from '../../services/api'
```

---

## Git Conventions

### Commit format

```
[TYPE](scope): short description
```

**Types:**

| Type | When to use |
|------|------------|
| `FEATURE` | New user-facing functionality |
| `FIX` | Bug fix |
| `REFACTOR` | Code restructure without behaviour change |
| `TEST` | Adding or updating tests |
| `DOCS` | Documentation only |
| `CHORE` | Tooling, deps, config, CI |

**Scopes:** `front` | `back` | `infra` | `db` | `ci`

**Examples:**

```
[FEATURE](front): add board kanban view
[FIX](front): correct session redirect on expired token
[TEST](front): add unit tests for useCreateBoard
[CHORE](front): upgrade Tailwind to v4.2
```

**Rules:**
- Description is mandatory.
- Commits are small and atomic — one logical change per commit.
- Never commit with `--no-verify`.
