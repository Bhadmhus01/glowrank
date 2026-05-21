import type { VercelRequest, VercelResponse } from '@vercel/node'

// Runs the 5-call chain (src/chain/orchestrator) for a paid order, renders the PDF,
// emails it, and exposes the report at its shareable URL. Internal trigger only.
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.status(501).json({ error: 'NOT_IMPLEMENTED', endpoint: 'generate' })
}
