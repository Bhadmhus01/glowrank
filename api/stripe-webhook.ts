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
  // TODO(M6): if action.kind === 'generate', look up the order (intake + photo keys) by
  // action.orderRef and run the generate flow (runChain → planFulfillment → execute).
  res.status(200).json({ received: true, action: action.kind })
}
