import 'server-only'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

// Pin to globalThis so HMR doesn't leak connection pools in dev
const globalForDb = globalThis as unknown as { _db?: ReturnType<typeof drizzle> }

function createDb() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })
  return drizzle(client)
}

export const db = globalForDb._db ??= createDb()
