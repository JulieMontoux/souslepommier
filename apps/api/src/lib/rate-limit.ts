import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

type Entry = { count: number; resetAt: number };
type Store = Record<string, Entry>;

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const STORE_PATH = join("/tmp", "slp-rate-limit.json");

function loadStore(): Store {
  try {
    return JSON.parse(readFileSync(STORE_PATH, "utf8")) as Store;
  } catch {
    return {};
  }
}

function saveStore(store: Store): void {
  try {
    mkdirSync("/tmp", { recursive: true });
    writeFileSync(STORE_PATH, JSON.stringify(store), "utf8");
  } catch {
    // Non-fatal — fallback to in-memory only for this request
  }
}

function pruneExpired(store: Store): Store {
  const now = Date.now();
  const pruned: Store = {};
  for (const [k, e] of Object.entries(store)) {
    if (now <= e.resetAt) pruned[k] = e;
  }
  return pruned;
}

export function checkRateLimit(key: string) {
  const now = Date.now();
  const store = pruneExpired(loadStore());
  const entry = store[key];

  if (!entry || now > entry.resetAt) {
    store[key] = { count: 1, resetAt: now + WINDOW_MS };
    saveStore(store);
    return {
      allowed: true,
      remaining: MAX_ATTEMPTS - 1,
      resetAt: now + WINDOW_MS,
    };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  store[key] = entry;
  saveStore(store);
  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - entry.count,
    resetAt: entry.resetAt,
  };
}

export function resetRateLimit(key: string): void {
  const store = loadStore();
  delete store[key];
  saveStore(store);
}
