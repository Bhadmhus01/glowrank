import type { VercelRequest, VercelResponse } from '@vercel/node'

// Scheduled daily (see vercel.json crons). Deletes every photo past its 30-day TTL.
// MUST run in production from day 1 (CLAUDE.md §10). Guarded by CRON_SECRET so it
// cannot be invoked publicly.
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.status(501).json({ error: 'NOT_IMPLEMENTED', endpoint: 'cron/delete-photos' })
}
