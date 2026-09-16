type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

function pruneExpired(now: number) {
  // Keep an abusive or high-cardinality IP list from growing without bound.
  if (buckets.size < 10_000) return;
  buckets.forEach((entry, key) => { if (entry.resetAt <= now) buckets.delete(key); });
}

export function assertRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  pruneExpired(now);
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    throw new Error(`Too many attempts. Try again in ${retryAfter} seconds.`);
  }
}

export function requestIp(req: { ip?: string; headers: Record<string, unknown> }) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() || req.ip || "unknown";
  return req.ip || "unknown";
}
