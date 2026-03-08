import Fastify from 'fastify';
import { dbPlugin } from './http/plugins/db.js';
/**
 * Creates and configures the Fastify application instance.
 * Plugins and routes are registered here.
 */
export async function buildApp() {
    const app = Fastify({ logger: true });
    await app.register(dbPlugin);
    return app;
}
/**
 * Entry point — starts the HTTP server.
 */
async function main() {
    const app = await buildApp();
    try {
        await app.listen({ port: 3000, host: '0.0.0.0' });
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=server.js.map