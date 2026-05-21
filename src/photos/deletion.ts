import type { StorageClient } from './storage'

// 30-day automated photo deletion (CLAUDE.md §2 rule 4, §10; PRD §5.3).
// The deletion cron MUST run in production from day 1 — it is not deferrable.

export const PHOTO_TTL_DAYS = 30
const TTL_MS = PHOTO_TTL_DAYS * 24 * 60 * 60 * 1000

/** True if a photo uploaded at `uploadedAt` is at or past its 30-day TTL relative to `now`. */
export function isExpired(uploadedAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - uploadedAt.getTime() >= TTL_MS
}

/**
 * Lists stored photos and deletes every one past its TTL. Invoked by
 * /api/cron/delete-photos. Returns counts for logging (no PII — CLAUDE.md §9).
 */
export async function deleteExpiredPhotos(
  storage: StorageClient,
  now: Date = new Date(),
): Promise<{ deleted: number; scanned: number }> {
  const objects = await storage.list()
  const expired = objects.filter((obj) => isExpired(obj.uploadedAt, now))
  for (const obj of expired) {
    await storage.delete(obj.key)
  }
  return { deleted: expired.length, scanned: objects.length }
}
