import { getStripeClient } from './stripe'

// Stripe refund execution — explicitly authorized (CLAUDE.md §7).
// Never touches raw card data; only references the PaymentIntent ID (CLAUDE.md §9).

/**
 * Issues a full refund for a completed payment. The paymentIntentId is stored on the
 * Order record when the Stripe webhook fires (see api/generate.ts).
 */
export async function refundOrder(paymentIntentId: string): Promise<void> {
  await getStripeClient().refunds.create({
    payment_intent: paymentIntentId,
  })
}
