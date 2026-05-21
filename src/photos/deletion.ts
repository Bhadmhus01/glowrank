// 30-day automated photo deletion (CLAUDE.md §2 rule 4, §10; PRD §5.3).
// The deletion cron MUST run in production from day 1 — it is not deferrable.

export const PHOTO_TTL_DAYS = 30

/** True if a photo uploaded at `uploadedAt` is past its 30-day TTL relative to `now`. */
export function isExpired(uploadedAt: Date, now: Date = new Date()): boolean {
  throw new Error('NOT_IMPLEMENTED: TTL expiry check')
}

/** Deletes every photo past its TTL. Invoked by /api/cron/delete-photos. */
export async function deleteExpiredPhotos(now: Date = new Date()): Promise<{ deleted: number }> {
  throw new Error('NOT_IMPLEMENTED: expired photo sweep')
}
