import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isAuthorizedCronRequest } from '../../src/photos/cron-auth'

// Scheduled daily (see vercel.json crons). Deletes every photo past its 30-day TTL.
// MUST run in production from day 1 (CLAUDE.md §10). Guarded by CRON_SECRET.
//
// Auth is live; the actual sweep needs the S3/R2 StorageClient adapter, which is
// deferred (FOLLOWUPS.md M4). Until then this returns 501 AFTER authorizing, so the
// schedule + auth are exercised but nothing is deleted yet.
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!isAuthorizedCronRequest(req.headers.authorization, process.env.CRON_SECRET)) {
    res.status(401).json({ error: 'UNAUTHORIZED' })
    return
  }

  // TODO(M4): const storage = createS3StorageClient(); const r = await deleteExpiredPhotos(storage);
  res.status(501).json({ error: 'NOT_IMPLEMENTED', reason: 'storage adapter pending (FOLLOWUPS M4)' })
}
