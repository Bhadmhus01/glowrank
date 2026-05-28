import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isAuthorizedCronRequest } from '../../src/photos/cron-auth'
import { deleteExpiredPhotos } from '../../src/photos/deletion'
import { createS3StorageClientFromEnv } from '../../src/photos/s3-storage'

// Scheduled daily (see vercel.json crons). Deletes every photo past its 30-day TTL.
// MUST run in production from day 1 (CLAUDE.md §10). Guarded by CRON_SECRET. Requires the
// PHOTO_* env vars to be configured (otherwise it 500s rather than silently no-op).
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!isAuthorizedCronRequest(req.headers.authorization, process.env.CRON_SECRET)) {
    res.status(401).json({ error: 'UNAUTHORIZED' })
    return
  }

  try {
    const result = await deleteExpiredPhotos(createS3StorageClientFromEnv())
    res.status(200).json(result) // { deleted, scanned } — counts only, no PII (CLAUDE.md §9)
  } catch (err) {
    // Infra error only — no user data in the message.
    console.error('delete-photos cron failed:', (err as Error).message)
    res.status(500).json({ error: 'DELETION_FAILED' })
  }
}
