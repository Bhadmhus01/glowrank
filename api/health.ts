import type { VercelRequest, VercelResponse } from '@vercel/node'

// Public liveness probe for uptime monitoring. Intentionally returns NO configuration or
// integration detail (avoids info disclosure) — launch-readiness lives in `npm run preflight`,
// an operator-only CLI. Keep this endpoint cheap and side-effect free.

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
    return
  }
  res.status(200).json({ ok: true, service: 'glowrank' })
}
