import type { VercelRequest, VercelResponse } from '@vercel/node'

// Serves a generated report at its unique shareable URL (PRD §3.2 Step 5).
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.status(501).json({ error: 'NOT_IMPLEMENTED', endpoint: 'report/[id]' })
}
