import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import websocketPlugin from "@fastify/websocket";
import multipart from "@fastify/multipart";
import { dbPlugin } from "./http/plugins/db.js";
import { emailPlugin } from "./http/plugins/email.js";
import { errorHandlerPlugin } from "./http/plugins/errorHandler.js";
import { jwtAuthPlugin } from "./http/plugins/jwtAuth.js";
import { boardRoutes } from "./http/routes/boards.js";
import { calendarRoutes } from "./http/routes/calendar.js";
import { chatRoutes } from "./http/routes/chat.js";
import { filesRoutes } from "./http/routes/files.js";
import { filesWsRoutes } from "./http/routes/filesWs.js";
import { goBackLinkRoutes } from "./http/routes/goBackLinks.js";
import { kanbanRoutes } from "./http/routes/kanban.js";
import { userRoutes } from "./http/routes/users.js";
import { DrizzleBoardRepository } from "./repositories/DrizzleBoardRepository.js";
import { DrizzleBoardFileRepository } from "./repositories/DrizzleBoardFileRepository.js";
import { DrizzleCalendarEventRepository } from "./repositories/DrizzleCalendarEventRepository.js";
import { DrizzleChatMessageRepository } from "./repositories/DrizzleChatMessageRepository.js";
import { DrizzleKanbanColumnRepository } from "./repositories/DrizzleKanbanColumnRepository.js";
import { DrizzleKanbanTaskRepository } from "./repositories/DrizzleKanbanTaskRepository.js";
import { DrizzleMemberRepository } from "./repositories/DrizzleMemberRepository.js";
import { DrizzleGoBackLinkRepository } from "./repositories/DrizzleGoBackLinkRepository.js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { DrizzleUserRepository } from "./repositories/DrizzleUserRepository.js";

/**
 * Creates and configures the Fastify application instance.
 * Plugins and routes are registered here.
 */
export async function buildApp() {
  // 1 MB body limit — prevents memory exhaustion from oversized payloads
  const app = Fastify({
    logger: {
      redact: ['req.body.password', 'body.password'],
    },
    bodyLimit: 1_048_576,
  });

  await app.register(errorHandlerPlugin);
  await app.register(jwtAuthPlugin);
  await app.register(cors, {
    origin: process.env["CORS_ORIGIN"] ?? "http://localhost:5173",
  });
  await app.register(websocketPlugin);
  await app.register(multipart);

  // Global rate limit: 200 requests / 15 min per IP.
  // Sensitive endpoints apply their own stricter limits (see routes).
  await app.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: "15 minutes",
  });
  await app.register(dbPlugin);

  const __dirname = dirname(fileURLToPath(import.meta.url));
  await migrate(app.db, { migrationsFolder: join(__dirname, "db/migrations") });

  await app.register(emailPlugin);

  const userRepo = new DrizzleUserRepository(app.db);

  await app.register(userRoutes, { userRepo });

  await app.register(boardRoutes, {
    boardRepo: new DrizzleBoardRepository(app.db),
    memberRepo: new DrizzleMemberRepository(app.db),
    goBackLinkRepo: new DrizzleGoBackLinkRepository(app.db),
  });

  await app.register(goBackLinkRoutes, {
    goBackLinkRepo: new DrizzleGoBackLinkRepository(app.db),
    memberRepo: new DrizzleMemberRepository(app.db),
  });

  const memberRepo = new DrizzleMemberRepository(app.db);
  await app.register(chatRoutes, {
    memberRepo,
    chatRepo: new DrizzleChatMessageRepository(app.db),
  });

  await app.register(kanbanRoutes, {
    memberRepo,
    columnRepo: new DrizzleKanbanColumnRepository(app.db),
    taskRepo: new DrizzleKanbanTaskRepository(app.db),
  });

  await app.register(calendarRoutes, {
    memberRepo,
    calendarRepo: new DrizzleCalendarEventRepository(app.db),
  });

  await app.register(filesRoutes, {
    memberRepo,
    fileRepo: new DrizzleBoardFileRepository(app.db),
  });

  await app.register(filesWsRoutes, {
    memberRepo,
    fileRepo: new DrizzleBoardFileRepository(app.db),
  });

  return app;
}

/**
 * Entry point — starts the HTTP server.
 */
async function main() {
  const app = await buildApp();

  try {
    await app.listen({
      port: Number(process.env["PORT"] ?? 3000),
      // host: process.env["HOST"] ?? "localhost",
      host: "0.0.0.0",
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
