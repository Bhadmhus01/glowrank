import type { VercelRequest, VercelResponse } from '@vercel/node'

// Stripe webhook. On verified payment_success, triggers report generation.
// Signature MUST be verified with STRIPE_WEBHOOK_SECRET. Never touches raw card data.
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.status(501).json({ error: 'NOT_IMPLEMENTED', endpoint: 'stripe-webhook' })
}

// Stripe requires the raw request body for signature verification.
export const config = { api: { bodyParser: false } }
