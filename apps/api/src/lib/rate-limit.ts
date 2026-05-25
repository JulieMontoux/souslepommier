type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function checkRateLimit(key: string) {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return {
      allowed: true,
      remaining: MAX_ATTEMPTS - 1,
      resetAt: now + WINDOW_MS,
    };
  }
  if (entry.count >= MAX_ATTEMPTS)
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  entry.count++;
  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - entry.count,
    resetAt: entry.resetAt,
  };
}

export function resetRateLimit(key: string) {
  store.delete(key);
}

setInterval(() => {
  const now = Date.now();
  for (const [k, e] of store.entries()) {
    if (now > e.resetAt) store.delete(k);
  }
}, WINDOW_MS);
