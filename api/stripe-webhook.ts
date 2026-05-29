import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getStripeClient, verifyStripeEvent, routeStripeEvent } from '../src/payments/stripe'

// Stripe requires the raw request body for signature verification.
export const config = { api: { bodyParser: false } }

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer))
  }
  return Buffer.concat(chunks)
}

// On a verified, PAID checkout, this should trigger report generation for the order.
// Signature is verified here; the generation trigger is the next M6 step.
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = req.headers['stripe-signature']
  if (!secret || typeof signature !== 'string') {
    res.status(400).json({ error: 'MISSING_SIGNATURE_OR_SECRET' })
    return
  }

  let event
  try {
    const rawBody = await readRawBody(req)
    event = verifyStripeEvent(rawBody, signature, secret, getStripeClient())
  } catch (err) {
    console.error('stripe webhook verification failed:', (err as Error).message)
    res.status(400).json({ error: 'INVALID_SIGNATURE' })
    return
  }

  const action = routeStripeEvent(event)

  if (action.kind === 'generate') {
    // Fire the generate endpoint and return immediately — Stripe needs a fast 200.
    // If the trigger itself fails, it's logged; the order is still in the store and
    // can be retried manually (FOLLOWUPS M6: replace with a proper queue when available).
    const host = process.env.VERCEL_URL ?? 'localhost:3000'
    const protocol = host.startsWith('localhost') ? 'http' : 'https'
    void fetch(`${protocol}://${host}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GENERATE_SECRET ?? ''}`,
      },
      body: JSON.stringify({ orderId: action.orderRef, paymentIntentId: action.paymentIntentId }),
    }).catch((err: Error) => {
      console.error('generate trigger failed:', err.message, { orderRef: action.orderRef })
    })
  }

  res.status(200).json({ received: true, action: action.kind })
}
