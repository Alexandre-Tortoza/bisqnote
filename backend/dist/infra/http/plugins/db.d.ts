import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
declare module 'fastify' {
    interface FastifyInstance {
        db: PostgresJsDatabase;
    }
}
/**
 * Fastify plugin that connects to PostgreSQL via Drizzle and decorates
 * the fastify instance with `fastify.db` — available across all scopes.
 */
export declare const dbPlugin: (fastify: import("fastify").FastifyInstance<import("fastify").RawServerDefault, import("node:http").IncomingMessage, import("node:http").ServerResponse<import("node:http").IncomingMessage>, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>) => Promise<void>;
//# sourceMappingURL=db.d.ts.map