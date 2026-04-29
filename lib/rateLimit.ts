interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();
let indexesEnsured = false;

async function ensureDistributedIndexes(): Promise<void> {
  if (indexesEnsured) return;
  try {
    const mongoose = await import("mongoose");
    const db = mongoose.default.connection?.db;
    if (!db) return;
    const coll = db.collection("_rateLimits");
    await coll.createIndex({ key: 1 }, { unique: true });
    await coll.createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 });
    indexesEnsured = true;
  } catch {
    // fall back to in-memory mode
  }
}

async function distributedCheckRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<boolean | null> {
  try {
    const mongoose = await import("mongoose");
    const db = mongoose.default.connection?.db;
    if (!db || process.env.DISABLE_DISTRIBUTED_RATE_LIMIT === "true") return null;
    await ensureDistributedIndexes();
    const coll = db.collection("_rateLimits");
    const now = new Date();
    const nextReset = new Date(Date.now() + windowMs);

    const incremented = await coll.updateOne(
      { key, resetAt: { $gt: now }, count: { $lt: maxAttempts } },
      { $inc: { count: 1 }, $set: { updatedAt: now } }
    );
    if ((incremented.modifiedCount ?? 0) > 0) return true;

    const existing = await coll.findOne<{ count?: number; resetAt?: Date }>({
      key,
      resetAt: { $gt: now },
    });
    if (existing && typeof existing.count === "number" && existing.count >= maxAttempts) {
      return false;
    }

    await coll.updateOne(
      { key },
      { $set: { key, count: 1, resetAt: nextReset, updatedAt: now } },
      { upsert: true }
    );
    return true;
  } catch {
    return null;
  }
}

/**
 * Returns true if the request is within the allowed rate, false if blocked.
 * @param key         Unique identifier - e.g. `"login:user@example.com"` or an IP.
 * @param maxAttempts Maximum allowed attempts within the window (default: 10).
 * @param windowMs    Sliding window in milliseconds (default: 60 s).
 */
export async function checkRateLimit(
  key: string,
  maxAttempts = 10,
  windowMs = 60_000
): Promise<boolean> {
  const distributed = await distributedCheckRateLimit(key, maxAttempts, windowMs);
  if (distributed !== null) return distributed;

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxAttempts) return false;
  entry.count++;
  return true;
}

/** Remove a key (e.g. after successful login). */
export async function clearRateLimit(key: string): Promise<void> {
  try {
    const mongoose = await import("mongoose");
    const db = mongoose.default.connection?.db;
    if (db && process.env.DISABLE_DISTRIBUTED_RATE_LIMIT !== "true") {
      await db.collection("_rateLimits").deleteOne({ key });
    }
  } catch {
    // fallback still clears in-memory
  }
  store.delete(key);
}
