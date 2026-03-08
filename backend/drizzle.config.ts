import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infra/db/schema',
  out: './src/infra/db/migrations',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? '',
  },
})
