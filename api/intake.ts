import type { VercelRequest, VercelResponse } from '@vercel/node'

// Receives the intake submission (Typeform/Tally webhook). Validates fields,
// enforces the under-18 hard gate, stores photos (EXIF-stripped), and records
// the funnel event. Does NOT generate the report — that waits for payment_success.
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.status(501).json({ error: 'NOT_IMPLEMENTED', endpoint: 'intake' })
}
