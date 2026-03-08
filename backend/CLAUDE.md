# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Runtime:** Node.js + TypeScript (strict)
- **Framework:** Fastify 5
- **Package manager:** pnpm
- **Testing:** Vitest

> Currently installed: only `fastify`. TypeScript, Vitest, and all dev tooling still need to be added before any source code is written.

## Bootstrap order (first-time setup)

Before writing any code, install and configure:
1. `typescript`, `@types/node`, `tsx` (or `ts-node`) as devDependencies
2. `vitest` and `@vitest/coverage-v8`
3. `tsconfig.json` with `"strict": true`
4. `package.json` scripts: `dev`, `build`, `test`, `test:watch`

## Commands

```bash
pnpm install               # install dependencies
pnpm test                  # run all tests
pnpm test src/__tests__/foo.test.ts  # run a single test file
pnpm test:watch            # watch mode
pnpm dev                   # start dev server (tsx watch)
pnpm build                 # tsc --noEmit or tsc -p tsconfig.json
```

## Methodology: XP / TDD

- **User guides (what), Claude does (how)** — do not invent requirements
- TDD is mandatory: test → fail → implement → pass → refactor
- Never write production code without a failing test first
- YAGNI, DRY — no premature abstractions, no dead code
- Domain unclear? Stop and ask before coding.

## Architecture: Clean Architecture

The project follows Clean Architecture with strict layer separation. Dependencies always point inward — outer layers depend on inner layers, never the reverse.

```
src/
  domain/             # Enterprise rules — no framework, no I/O
    entities/         # Core business objects and value objects
    repositories/     # Interfaces (ports) — implemented by infra
    use-cases/        # Application business rules (one class per use case)

  infra/              # Adapters — implements domain interfaces
    db/               # Repository implementations (DB, ORM, etc.)
    http/
      routes/         # Fastify route handlers — thin, call use cases only
      plugins/        # Fastify plugins (auth, cors, etc.)
    server.ts         # Fastify instance creation and plugin registration

  __tests__/          # Mirrors src structure; unit-test domain, integration-test infra
```

### Layer rules

- **domain/** — pure TypeScript, zero external dependencies. No Fastify, no DB drivers.
- **use-cases/** — orchestrate domain entities and repository interfaces; no HTTP concepts.
- **routes/** — map HTTP request/response to use-case calls; no business logic.
- **infra/** — only layer allowed to depend on Fastify, DB drivers, or third-party libs.

### Code principles

- **Clean Architecture**: dependency rule is non-negotiable — never import infra into domain.
- **Modular**: each feature lives in its own vertical slice across all layers.
- **Documented**: every public interface, use case, and entity must have a JSDoc comment explaining intent (not implementation).
- **DRY**: extract shared logic into domain utilities or composable use cases, not helpers scattered across layers.
- **YAGNI**: implement only what the current use case requires; no speculative abstractions.
- **Clean Code**: names must express intent; functions do one thing; no magic values.

Fastify plugin system uses encapsulation — register routes/plugins via `fastify.register()` to scope context. Use `fastify-plugin` only when a decorator must be shared across scopes.
