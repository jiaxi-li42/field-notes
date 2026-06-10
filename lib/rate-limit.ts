import 'server-only'

// globalThis so HMR doesn't recreate the store in dev
const globalForRL = globalThis as unknown as { _rlStore?: Map<string, number[]> }
const store = globalForRL._rlStore ??= new Map<string, number[]>()

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now()
  const timestamps = store.get(key)?.filter((t) => now - t < windowMs) ?? []

  if (timestamps.length >= limit) {
    store.set(key, timestamps)
    return false
  }

  timestamps.push(now)
  store.set(key, timestamps)

  // Lazy cleanup: purge fully-expired keys when store grows large
  if (store.size > 1000) {
    for (const [k, ts] of store) {
      if (ts.every((t) => now - t >= windowMs)) store.delete(k)
    }
  }

  return true
}
