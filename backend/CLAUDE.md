# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

| Tool                              | Role                             |
| --------------------------------- | -------------------------------- |
| **Node.js**                       | Runtime                          |
| **TypeScript 5** (`strict: true`) | Language                         |
| **Fastify 5**                     | HTTP framework                   |
| **Drizzle ORM**                   | Query builder + schema manager   |
| **PostgreSQL**                    | Database (via `postgres-js`)     |
| **Nodemailer**                    | Transactional email              |
| **bcryptjs**                      | Password / token hashing         |
| **Vitest**                        | Test runner                      |
| **tsx**                           | Dev server (no compilation step) |
| **pnpm**                          | Package manager                  |

## Commands

```bash
pnpm install               # install dependencies
pnpm dev                   # start dev server (tsx watch src/infra/server.ts)
pnpm build                 # tsc -p tsconfig.json
pnpm test                  # run all tests once
pnpm test src/__tests__/foo.test.ts  # run a single test file
pnpm test:watch            # watch mode
pnpm test:coverage         # run tests with V8 coverage
pnpm db:generate           # generate SQL migration from schema changes
pnpm db:migrate            # apply pending migrations
pnpm db:studio             # open Drizzle Studio (visual DB browser)
pnpm db:seed               # insert dev seed data
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
  domain/
    entities/         # Plain TS interfaces — core business objects (BoardEntity, etc.)
    errors/           # AppError — only error type for expected domain failures
    repositories/     # I*Repository interfaces (ports) — never import infra here
    services/         # IEmailService interface (port)
    use-cases/        # One class per operation, single execute() method

  infra/
    db/
      schema/         # Drizzle table definitions (snake_case columns)
      migrations/     # Auto-generated SQL — never edit manually
      seed/           # Dev seed data
      connection.ts   # postgres-js client factory
    http/
      plugins/        # db, email, errorHandler — use fastify-plugin for shared decorators
      routes/         # Thin handlers: validate → call use case → reply
    repositories/     # Drizzle*Repository — implements I*Repository
    services/         # NodemailerEmailService — implements IEmailService
    server.ts         # buildApp() wires plugins + routes; main() starts server

  __tests__/
    domain/use-cases/ # Pure unit tests — mock all deps with vi.fn(), no DB, no HTTP
    infra/routes/     # Integration tests — buildApp() + app.inject()
    infra/            # Plugin integration tests
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
