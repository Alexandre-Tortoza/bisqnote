import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { dbPlugin } from "./http/plugins/db.js";
import { emailPlugin } from "./http/plugins/email.js";
import { errorHandlerPlugin } from "./http/plugins/errorHandler.js";
import { boardRoutes } from "./http/routes/boards.js";
import { goBackLinkRoutes } from "./http/routes/goBackLinks.js";
import { userRoutes } from "./http/routes/users.js";
import { DrizzleBoardRepository } from "./repositories/DrizzleBoardRepository.js";
import { DrizzleMemberRepository } from "./repositories/DrizzleMemberRepository.js";
import { DrizzleGoBackLinkRepository } from "./repositories/DrizzleGoBackLinkRepository.js";
import { DrizzleUserRepository } from "./repositories/DrizzleUserRepository.js";

/**
 * Creates and configures the Fastify application instance.
 * Plugins and routes are registered here.
 */
export async function buildApp() {
  // 1 MB body limit — prevents memory exhaustion from oversized payloads
  const app = Fastify({ logger: true, bodyLimit: 1_048_576 });

  await app.register(errorHandlerPlugin);
  await app.register(cors, {
    origin: process.env["CORS_ORIGIN"] ?? "http://localhost:5173",
  });

  // Global rate limit: 200 requests / 15 min per IP.
  // Sensitive endpoints apply their own stricter limits (see routes).
  await app.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: '15 minutes',
  });
  await app.register(dbPlugin);
  await app.register(emailPlugin);

  const userRepo = new DrizzleUserRepository(app.db);

  await app.register(userRoutes, { userRepo });

  await app.register(boardRoutes, {
    boardRepo: new DrizzleBoardRepository(app.db),
    memberRepo: new DrizzleMemberRepository(app.db),
    goBackLinkRepo: new DrizzleGoBackLinkRepository(app.db),
    userRepo,
  });

  await app.register(goBackLinkRoutes, {
    goBackLinkRepo: new DrizzleGoBackLinkRepository(app.db),
    memberRepo: new DrizzleMemberRepository(app.db),
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
      host: process.env["HOST"] ?? "localhost",
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
