// Serial numbers are allocated as "last + 1", so two simultaneous creates can collide on the
// unique index (P2002) or hit a transient transaction write conflict (P2034). Retrying
// re-reads the latest serial and resolves it.
const RETRYABLE = new Set(['P2002', 'P2034'])

export async function withRetry(fn, attempts = 4) {
  let lastError
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn()
    } catch (err) {
      if (!RETRYABLE.has(err.code)) throw err
      lastError = err
      await new Promise((resolve) => setTimeout(resolve, 25 * (i + 1) + Math.random() * 50))
    }
  }
  throw lastError
}
