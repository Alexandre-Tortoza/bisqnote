# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack web application: Vue 3 frontend + Fastify backend, deployed via Kamal (Docker).

- **Package manager:** pnpm (both frontend and backend)
- **Frontend:** `frontend/` — Vue 3 + Vite + TypeScript strict + Pinia + Vue Router
- **Backend:** `backend/` — Node.js + TypeScript strict + Fastify 5

## Frontend Commands

```bash
cd frontend
pnpm dev                   # dev server at http://localhost:5173
pnpm build                 # type-check + build
pnpm type-check            # vue-tsc --build
pnpm lint                  # oxlint + eslint (with --fix)
pnpm format                # oxfmt src/
pnpm test:unit             # Vitest (jsdom, watch mode)
pnpm test:unit --run       # run unit tests once
pnpm test:unit src/features/public/__tests__/useCreateBoard.spec.ts  # single test file
pnpm test:e2e              # Playwright (requires pnpm dev or preview running)
```

## Backend Commands

```bash
cd backend
pnpm install
pnpm dev                   # tsx watch src/infra/server.ts
pnpm build                 # tsc -p tsconfig.json
pnpm test                  # Vitest
pnpm test src/__tests__/foo.test.ts  # single test file
pnpm test:watch            # watch mode
pnpm test:coverage         # V8 coverage report
pnpm db:generate           # generate migration from schema changes
pnpm db:migrate            # apply pending migrations
pnpm db:studio             # Drizzle Studio (visual DB browser)
pnpm db:seed               # insert dev seed data
```

## Architecture

### Frontend (`frontend/src/`)

Feature-based modular architecture — each domain is self-contained under `src/features/<name>/`. See `frontend/CONTRIBUTING.md` for the full guide.

```
src/
  features/        # public (/, /create, /join) · board (/board/:id and sub-routes)
  components/      # shared UI: ui/, layout/, forms/, feedback/
  stores/          # global Pinia stores: useThemeStore, useSessionStore, useLocaleStore
  services/        # HTTP client (api.ts) and ApiError
  plugins/         # i18n setup
  locales/         # en.ts, pt-BR.ts
  router/          # Vue Router (imports views from feature index.ts barrels)
  composables/     # global composables
  utils/           # global pure utilities
  test-utils/      # shared helpers for unit tests
```

Key rules:
- `<script setup lang="ts">` everywhere — no Options API
- All HTTP calls through `src/services/api.ts` only
- Cross-feature imports must go through `feature/index.ts` barrels
- Stores use Composition API style; guard `localStorage`/`window` with `typeof` checks

Linting: dual-linter setup — Oxlint runs first (fast), then ESLint for rules Oxlint doesn't cover.

### Backend (`backend/src/`)

Follows **Clean Architecture** — dependencies always point inward (infra → domain, never domain → infra).

```
src/
  domain/             # Pure TypeScript — no framework, no I/O
    entities/         # Business object interfaces (BoardEntity, etc.)
    errors/           # AppError — expected domain failures
    repositories/     # I*Repository interfaces (ports)
    services/         # IEmailService interface (port)
    use-cases/        # One class per operation, single execute() method

  infra/              # All framework/I/O code
    db/schema/        # Drizzle table definitions
    db/migrations/    # Auto-generated SQL (never edit manually)
    http/routes/      # Thin Fastify handlers — call use cases only
    http/plugins/     # db, email, errorHandler (fastify-plugin)
    repositories/     # Drizzle implementations of I* ports
    services/         # Nodemailer implementation of IEmailService
    server.ts         # buildApp() + main()

  __tests__/          # Mirrors src; unit tests for domain, integration tests for infra
```

Fastify plugin encapsulation: use `fastify.register()` to scope context; use `fastify-plugin` only when sharing decorators (e.g., `fastify.db`) across scopes.

## Methodology

TDD is mandatory: write a failing test first, then implement. Never write production code without a failing test. YAGNI — no premature abstractions.

## Git Conventions

Commit format: `[TYPE](scope): short description`

**Types:** `FEATURE` | `FIX` | `REFACTOR` | `TEST` | `DOCS` | `CHORE`

**Scopes:** `front` | `back` | `infra` | `db` | `ci`

**Rules:**
- Description is mandatory — never omit it
- Small, atomic commits per logical unit
- Examples:
  - `[FEATURE](front): add login form with validation`
  - `[FIX](back): handle null user in auth middleware`
  - `[CHORE](infra): add Kamal deploy config`
  - `[TEST](back): add unit tests for auth service`
