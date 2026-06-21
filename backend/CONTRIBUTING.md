# Contributing Guide — BisqNode Backend

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Architecture](#project-architecture)
- [Folder Structure](#folder-structure)
- [Development Setup](#development-setup)
- [Conventions](#conventions)
- [Adding a New Feature](#adding-a-new-feature)
- [Writing Tests](#writing-tests)
- [Database: Schema & Migrations](#database-schema--migrations)
- [Error Handling](#error-handling)
- [Git Conventions](#git-conventions)

---

## Tech Stack

| Tool | Role |
|---|---|
| **Node.js** | Runtime |
| **TypeScript 5** (strict) | Language — all code is typed, no `any` |
| **Fastify 5** | HTTP framework — schema validation, plugins, hooks |
| **Drizzle ORM** | Database query builder and schema manager |
| **PostgreSQL** | Primary database |
| **Nodemailer** | Transactional email |
| **bcryptjs** | Password/token hashing |
| **Vitest** | Test runner (unit + integration) |
| **tsx** | Dev server runner (no compilation step) |
| **pnpm** | Package manager |

---

## Project Architecture

The backend follows **Clean Architecture**. The dependency rule is absolute: **outer layers depend on inner layers, never the reverse**.

```
┌──────────────────────────────────────────────────────┐
│  infra/                  (outermost — framework code) │
│  ┌────────────────────────────────────────────────┐   │
│  │  domain/             (innermost — pure logic)  │   │
│  │  ┌──────────────────────────────────────────┐  │   │
│  │  │  entities/   value objects, interfaces   │  │   │
│  │  │  repositories/   I* interfaces (ports)   │  │   │
│  │  │  use-cases/  one class per operation      │  │   │
│  │  │  errors/     AppError                    │  │   │
│  │  └──────────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### Layer responsibilities

#### `domain/` — pure TypeScript, zero external dependencies

- **`entities/`** — plain TypeScript interfaces/types that represent core business objects (e.g., `BoardEntity`, `BoardMemberEntity`). No classes with DB concerns, no Fastify types.
- **`repositories/`** — interfaces (ports) that define persistence contracts (e.g., `IBoardRepository`). Implementation lives in `infra/`.
- **`services/`** — interfaces for external services like email (e.g., `IEmailService`). Implementation lives in `infra/`.
- **`use-cases/`** — orchestrate domain logic. Each use case is a class with a single `execute()` method. No HTTP, no SQL. Receives dependencies via constructor injection.
- **`errors/`** — `AppError` is the only error type used for expected domain failures.

#### `infra/` — all framework/I/O code lives here

- **`db/schema/`** — Drizzle table definitions. One file per domain area. Column names are `snake_case`.
- **`db/migrations/`** — Generated SQL migration files. Never edit by hand.
- **`repositories/`** — `Drizzle*Repository` classes that implement `I*Repository` interfaces.
- **`services/`** — Concrete service implementations (e.g., `NodemailerEmailService`).
- **`http/routes/`** — Fastify route handlers. Thin: validate input → call use case → send response. No business logic here.
- **`http/plugins/`** — Fastify plugins for cross-cutting concerns (DB, email, error handling, CORS).
- **`server.ts`** — `buildApp()` wires everything together: registers plugins and routes with injected repositories.

---

## Folder Structure

```
src/
  domain/
    entities/           # TypeScript interfaces for business objects
    errors/             # AppError
    repositories/       # I*Repository interfaces (ports)
    services/           # IEmailService (port)
    use-cases/          # One class per operation

  infra/
    db/
      schema/           # Drizzle table definitions
      migrations/       # Auto-generated SQL (drizzle-kit)
      seed/             # Dev seed data
      connection.ts     # postgres-js client factory
    http/
      plugins/          # db, email, errorHandler, cors
      routes/           # Fastify route files
    repositories/       # Drizzle implementations of domain interfaces
    services/           # Nodemailer implementation of IEmailService
    server.ts           # buildApp() + main()

  __tests__/
    domain/
      use-cases/        # Pure unit tests (no DB, no HTTP)
    infra/
      routes/           # Integration tests with buildApp()
      *.test.ts         # Plugin integration tests
```

---

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm
- Docker (for PostgreSQL)

### First run

```bash
# Start a local PostgreSQL instance
docker run -d \
  --name bisqnode-db \
  -e POSTGRES_USER=bisq \
  -e POSTGRES_PASSWORD=bisq \
  -e POSTGRES_DB=bisqnode \
  -p 5432:5432 \
  postgres:16

# Install dependencies
pnpm install

# Copy and fill environment variables
cp .env.example .env

# Run database migrations
pnpm db:migrate

# Seed development data (optional)
pnpm db:seed

# Start the dev server (hot reload via tsx)
pnpm dev
```

### Environment variables (`.env`)

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `APP_URL` | Frontend URL (used in emails) | `http://localhost:5173` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `SMTP_HOST` | SMTP server hostname | — |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | — |
| `SMTP_PASS` | SMTP password | — |
| `EMAIL_FROM` | Sender address | — |

### Useful commands

```bash
pnpm dev              # start dev server with hot reload
pnpm test             # run all tests once
pnpm test:watch       # run tests in watch mode
pnpm test:coverage    # run tests with V8 coverage report
pnpm build            # compile TypeScript to dist/
pnpm db:generate      # generate migration from schema changes
pnpm db:migrate       # apply pending migrations
pnpm db:studio        # open Drizzle Studio (visual DB browser)
pnpm db:seed          # insert dev seed data
```

---

## Conventions

### TypeScript

- `strict: true` — no implicit `any`, no unsafe assignments.
- Use `interface` for entity types and public API shapes; use `type` for unions/intersections.
- Never use `as any` — use type guards or proper generics instead.
- All imports from the same project must use the `.js` extension (ESM requirement), even for `.ts` source files.
- All public interfaces, use cases, and entities must have a JSDoc comment explaining intent (not implementation).

```ts
// ✅ correct import
import { CreateBoardUseCase } from '../domain/use-cases/CreateBoard.js'

// ❌ wrong
import { CreateBoardUseCase } from '../domain/use-cases/CreateBoard'
```

### Naming

| Concept | Convention | Example |
|---|---|---|
| Files | `PascalCase` | `CreateBoard.ts` |
| Interfaces (ports) | `I` prefix | `IBoardRepository` |
| Repository impls | `Drizzle` prefix | `DrizzleBoardRepository` |
| DB columns | `snake_case` | `owner_email`, `is_private` |
| TypeScript fields | `camelCase` | `ownerEmail`, `isPrivate` |
| Use case classes | `*UseCase` suffix | `CreateBoardUseCase` |
| Test factories | `make*` prefix | `makeBoard()`, `makeMember()` |

### Code principles

- **One class per use case** — `CreateBoardUseCase`, `RecoverBoardsUseCase`, `RedeemGoBackLinkUseCase`.
- **Routes are thin** — a route handler creates the use case and calls `execute()`. Nothing more.
- **Constructor injection** — use cases receive dependencies via constructor; no service locators.
- **Never import `infra` from `domain`** — that's the cardinal rule.
- **No magic values** — extract constants or put them in the domain.

---

## Adding a New Feature

Follow this checklist in order. Example: adding a `Kanban` feature.

### 1. Define the entity (`domain/entities/`)

```ts
// src/domain/entities/KanbanCard.ts

/** A single card on a Kanban column. */
export interface KanbanCardEntity {
  id: string
  boardId: string
  columnId: string
  title: string
  position: number
  createdAt: Date
}
```

### 2. Define the repository port (`domain/repositories/`)

```ts
// src/domain/repositories/IKanbanRepository.ts

import type { KanbanCardEntity } from '../entities/KanbanCard.js'

/** Port for Kanban persistence — implemented by infra only. */
export interface IKanbanRepository {
  createCard(data: { boardId: string; columnId: string; title: string }): Promise<KanbanCardEntity>
  listCardsByBoard(boardId: string): Promise<KanbanCardEntity[]>
}
```

### 3. Write the use case **test first** (`__tests__/domain/use-cases/`)

Write the failing test before the implementation.

```ts
// src/__tests__/domain/use-cases/CreateKanbanCard.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IKanbanRepository } from '../../../domain/repositories/IKanbanRepository.js'
import { CreateKanbanCardUseCase } from '../../../domain/use-cases/CreateKanbanCard.js'

describe('CreateKanbanCardUseCase', () => {
  let kanbanRepo: IKanbanRepository

  beforeEach(() => {
    kanbanRepo = {
      createCard: vi.fn().mockResolvedValue({ id: 'card-1', ... }),
      listCardsByBoard: vi.fn().mockResolvedValue([]),
    }
  })

  it('creates a card with the given title', async () => {
    const useCase = new CreateKanbanCardUseCase(kanbanRepo)
    const result = await useCase.execute({ boardId: 'b-1', columnId: 'col-1', title: 'Task A' })
    expect(result.title).toBe('Task A')
  })
})
```

### 4. Implement the use case (`domain/use-cases/`)

```ts
// src/domain/use-cases/CreateKanbanCard.ts

import type { IKanbanRepository } from '../repositories/IKanbanRepository.js'
import type { KanbanCardEntity } from '../entities/KanbanCard.js'

/** Creates a new Kanban card on a board column. */
export class CreateKanbanCardUseCase {
  constructor(private readonly kanbanRepo: IKanbanRepository) {}

  async execute(input: { boardId: string; columnId: string; title: string }): Promise<KanbanCardEntity> {
    return this.kanbanRepo.createCard(input)
  }
}
```

### 5. Add the DB schema (`infra/db/schema/`)

```ts
// src/infra/db/schema/kanban.ts (already exists — extend or add tables)

import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core'

export const kanban_cards = pgTable('kanban_cards', {
  id:        uuid('id').primaryKey().defaultRandom(),
  board_id:  uuid('board_id').notNull(),
  column_id: uuid('column_id').notNull(),
  title:     text('title').notNull(),
  position:  integer('position').notNull().default(0),
  created_at: timestamp('created_at').notNull().defaultNow(),
})
```

Then export it from `schema/index.ts` and generate the migration:

```bash
pnpm db:generate
pnpm db:migrate
```

### 6. Implement the repository (`infra/repositories/`)

```ts
// src/infra/repositories/DrizzleKanbanRepository.ts

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { IKanbanRepository } from '../../domain/repositories/IKanbanRepository.js'
import { kanban_cards } from '../db/schema/index.js'

/** Drizzle ORM implementation of IKanbanRepository. */
export class DrizzleKanbanRepository implements IKanbanRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async createCard(data: { boardId: string; columnId: string; title: string }) {
    const [row] = await this.db.insert(kanban_cards).values({
      board_id: data.boardId,
      column_id: data.columnId,
      title: data.title,
    }).returning()
    return this.toEntity(row!)
  }

  // ...toEntity, listCardsByBoard
}
```

### 7. Write the route and its integration test

```ts
// src/infra/http/routes/kanban.ts

export async function kanbanRoutes(fastify: FastifyInstance, options: { kanbanRepo: IKanbanRepository }) {
  fastify.post('/api/boards/:boardId/cards', async (request, reply) => {
    const useCase = new CreateKanbanCardUseCase(options.kanbanRepo)
    const result = await useCase.execute(...)
    return reply.status(201).send(result)
  })
}
```

Integration tests use `buildApp()` from `server.ts` with mocked or real repositories.

### 8. Register the route in `server.ts`

```ts
await app.register(kanbanRoutes, {
  kanbanRepo: new DrizzleKanbanRepository(app.db),
})
```

---

## Writing Tests

### Unit tests (`__tests__/domain/`)

Test use cases in full isolation: mock all repositories and services with `vi.fn()`. No DB, no HTTP.

```ts
// Pattern for mocking a repository
const repo: IKanbanRepository = {
  createCard: vi.fn().mockResolvedValue(makeKanbanCard()),
  listCardsByBoard: vi.fn().mockResolvedValue([]),
}
```

Use factory functions (`makeBoard()`, `makeMember()`) to produce fixture objects with sane defaults and easy overrides:

```ts
const makeKanbanCard = (overrides: Partial<KanbanCardEntity> = {}): KanbanCardEntity => ({
  id: 'card-1',
  boardId: 'board-1',
  columnId: 'col-1',
  title: 'Default title',
  position: 0,
  createdAt: new Date(),
  ...overrides,
})
```

### Integration tests (`__tests__/infra/routes/`)

Use `buildApp()` and `app.inject()` to test full HTTP roundtrips. Inject mocked repositories directly:

```ts
import { buildApp } from '../../../infra/server.js'

const app = await buildApp()
const response = await app.inject({
  method: 'POST',
  url: '/api/boards',
  payload: { name: 'My board' },
})
expect(response.statusCode).toBe(201)
```

### TDD is mandatory

1. Write a **failing** test
2. Run `pnpm test:watch` and confirm it fails
3. Write the minimum implementation to make it pass
4. Refactor if needed, keeping tests green

---

## Database: Schema & Migrations

Schemas live in `src/infra/db/schema/`. Each file covers a domain area (`boards.ts`, `kanban.ts`, `members.ts`, etc.) and is re-exported from `schema/index.ts`.

### Adding a table or column

1. Edit or create the schema file in `src/infra/db/schema/`
2. Run `pnpm db:generate` — Drizzle Kit diffs the schema and creates a new `.sql` file in `migrations/`
3. Run `pnpm db:migrate` to apply it locally
4. Commit both the schema change and the generated migration file

**Never edit migration files manually.** If a migration is wrong, revert the schema change and regenerate.

### Column naming

DB columns use `snake_case`. TypeScript entity fields use `camelCase`. Map between them in the `toEntity()` private method of each repository:

```ts
private toEntity(row: typeof boards.$inferSelect): BoardEntity {
  return {
    id: row.id,
    isPrivate: row.is_private,       // snake → camel
    ownerEmail: row.owner_email,
    // ...
  }
}
```

---

## Error Handling

Use `AppError` for all expected domain failures (validation, not found, unauthorized):

```ts
import { AppError } from '../errors/AppError.js'

if (!input.password) {
  throw new AppError('INVALID_INPUT', 'Password is required for private boards')
}
```

The global `errorHandlerPlugin` (`infra/http/plugins/errorHandler.ts`) intercepts all errors:
- `AppError` → HTTP 400 with `{ error: message }`
- Fastify/AJV validation errors → HTTP 400
- Everything else → HTTP 500 with a generic message (original error is logged server-side only)

**Never throw raw `Error` for business rule violations** — it would leak as a 500.

---

## Git Conventions

Commit format: `[TYPE](scope): short description`

**Types:** `FEATURE` | `FIX` | `REFACTOR` | `TEST` | `DOCS` | `CHORE`

**Scopes:** `back` | `front` | `infra` | `db` | `ci`

```
[FEATURE](back): add create kanban card use case
[TEST](back): add unit tests for CreateKanbanCard
[FIX](back): handle missing column_id in kanban route
[CHORE](db): add migration for kanban_cards table
```

Rules:
- One logical change per commit — do not bundle unrelated changes
- The description is mandatory and must be in the imperative mood ("add", "fix", "handle")
- Each new feature should produce at least two commits: one `[TEST]` and one `[FEATURE]`
