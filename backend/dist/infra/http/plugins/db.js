import fp from 'fastify-plugin';
import { drizzle } from 'drizzle-orm/postgres-js';
import { createClient } from '../../db/connection.js';
/**
 * Fastify plugin that connects to PostgreSQL via Drizzle and decorates
 * the fastify instance with `fastify.db` — available across all scopes.
 */
export const dbPlugin = fp(async (fastify) => {
    const client = createClient();
    const db = drizzle(client);
    fastify.decorate('db', db);
    fastify.addHook('onClose', async () => {
        await client.end();
    });
});
//# sourceMappingURL=db.js.map