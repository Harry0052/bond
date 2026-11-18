import { eq } from "drizzle-orm";
import type { BondDb } from "@/lib/db/client";
import { rateBuckets } from "@/lib/db/schema";

export function consumeRateLimit(db: BondDb, key: string, limit: number, windowMs: number, now = Date.now()) {
  return db.transaction((tx) => {
    const row = tx.select().from(rateBuckets).where(eq(rateBuckets.bucketKey, key)).get();
    const fresh = !row || now - Date.parse(row.windowStart) >= windowMs;
    if (fresh) {
      tx.insert(rateBuckets)
        .values({ bucketKey: key, windowStart: new Date(now).toISOString(), count: 1 })
        .onConflictDoUpdate({
          target: rateBuckets.bucketKey,
          set: { windowStart: new Date(now).toISOString(), count: 1 },
        })
        .run();
      return true;
    }
    if (row.count >= limit) return false;
    tx.update(rateBuckets)
      .set({ count: row.count + 1 })
      .where(eq(rateBuckets.bucketKey, key))
      .run();
    return true;
  });
}

export const LIMITS = {
  profile: { limit: 60, windowMs: 60 * 60 * 1000 },
  createBond: { limit: 30, windowMs: 60 * 60 * 1000 },
  join: { limit: 40, windowMs: 60 * 60 * 1000 },
  accept: { limit: 60, windowMs: 60 * 60 * 1000 },
  revise: { limit: 30, windowMs: 60 * 60 * 1000 },
  complete: { limit: 60, windowMs: 60 * 60 * 1000 },
  remove: { limit: 30, windowMs: 60 * 60 * 1000 },
  export: { limit: 10, windowMs: 60 * 60 * 1000 },
  deleteAccount: { limit: 5, windowMs: 60 * 60 * 1000 },
  template: { limit: 20, windowMs: 60 * 60 * 1000 },
} as const;
