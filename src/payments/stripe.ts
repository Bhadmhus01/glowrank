import Stripe from 'stripe'

// Stripe is hosted Checkout (CLAUDE.md §4). This module verifies inbound webhooks and
// decides what they mean. It does NOT charge or refund — refund execution is a separate,
// explicitly-gated step (FOLLOWUPS M6). Never touch raw card data (CLAUDE.md §9).

let client: Stripe | null = null

export function getStripeClient(): Stripe {
  if (client === null) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
    client = new Stripe(key)
  }
  return client
}

export type StripeAction =
  | { kind: 'generate'; orderRef: string; paymentIntentId: string | null }
  | { kind: 'ignore'; reason: string }

/**
 * Verifies the webhook signature and parses the event. Throws on an invalid signature —
 * the caller must reject (HTTP 400) and never process an unverified event.
 */
export function verifyStripeEvent(
  rawBody: string | Buffer,
  signature: string,
  secret: string,
  stripe: Stripe,
): Stripe.Event {
  return stripe.webhooks.constructEvent(rawBody, signature, secret)
}

/**
 * Decides what a verified event means. Report generation is triggered only by a fully
 * PAID checkout that carries an order reference (set as client_reference_id or
 * metadata.order_id when the Checkout Session is created).
 */
export function routeStripeEvent(event: Stripe.Event): StripeAction {
  if (event.type !== 'checkout.session.completed') {
    return { kind: 'ignore', reason: `unhandled event type: ${event.type}` }
  }
  const session = event.data.object as Stripe.Checkout.Session
  const orderRef = session.client_reference_id ?? session.metadata?.order_id ?? null
  if (orderRef === null) {
    return { kind: 'ignore', reason: 'checkout.session.completed without an order reference' }
  }
  if (session.payment_status !== 'paid') {
    return { kind: 'ignore', reason: `payment_status=${session.payment_status}` }
  }
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null
  return { kind: 'generate', orderRef, paymentIntentId }
}
