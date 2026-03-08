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
pnpm test:unit             # Vitest (jsdom)
pnpm test:unit src/__tests__/Foo.spec.ts  # single test file
pnpm test:e2e              # Playwright (requires pnpm dev or preview running)
```

## Backend Commands

> Backend is in bootstrap phase — TypeScript, Vitest, and dev tooling not yet installed. See `backend/CLAUDE.md` for bootstrap checklist.

```bash
cd backend
pnpm install
pnpm dev                   # tsx watch src/server.ts
pnpm test                  # Vitest
pnpm test src/__tests__/foo.test.ts  # single test file
pnpm build                 # tsc
```

## Architecture

### Frontend (`frontend/src/`)

- `main.ts` — app bootstrap, registers Pinia and Vue Router
- `router/` — Vue Router configuration
- `stores/` — Pinia stores (actions only, no direct state mutation)
- `__tests__/` — Vitest unit tests alongside source

Linting: dual-linter setup — Oxlint runs first (fast), then ESLint for rules Oxlint doesn't cover.

### Backend (`backend/src/`) — not yet scaffolded

Expected layout per `backend/CLAUDE.md`:
```
src/
  server.ts       # Fastify instance + plugin registration
  routes/         # Thin HTTP handlers, delegate to services
  services/       # Business logic
  plugins/        # Fastify plugins (auth, db, etc.)
  __tests__/      # Tests mirroring src structure
```

Fastify plugin encapsulation: use `fastify.register()` to scope context; use `fastify-plugin` only when sharing decorators across scopes.

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
