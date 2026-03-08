import postgres from 'postgres'

/**
 * Creates a postgres.js client using DATABASE_URL from environment.
 */
export function createClient() {
  const url = process.env['DATABASE_URL']
  if (!url) throw new Error('DATABASE_URL is not set')
  return postgres(url)
}
