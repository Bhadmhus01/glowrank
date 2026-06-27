import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getStripeClient } from '../src/payments/stripe'
import { createCheckoutSession, checkoutConfigFromEnv } from '../src/payments/checkout'
import { createS3BlobStoreFromEnv } from '../src/storage/blob-store'
import { createOrderStore } from '../src/orders/order-store'

// User-facing endpoint: the intake front-end calls this after an order is created
// (api/intake.ts returns { orderId }) to start hosted Stripe Checkout. It returns the
// redirect URL; the front-end navigates the browser there. No card data passes through here —
// payment is collected entirely on Stripe's hosted page (CLAUDE.md §4/§9).

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
    return
  }

  const orderId: unknown = req.body?.orderId
  if (typeof orderId !== 'string' || orderId.length === 0) {
    res.status(400).json({ error: 'MISSING_ORDER_ID' })
    return
  }

  // Verify the order exists before creating a payment session (no checkout for bogus ids).
  let order
  try {
    order = await createOrderStore(createS3BlobStoreFromEnv()).get(orderId)
  } catch (err) {
    console.error('checkout order lookup failed:', (err as Error).message, { orderId })
    res.status(500).json({ error: 'CHECKOUT_FAILED' })
    return
  }
  if (order === null) {
    res.status(404).json({ error: 'ORDER_NOT_FOUND' })
    return
  }

  try {
    const { url } = await createCheckoutSession(getStripeClient(), orderId, checkoutConfigFromEnv())
    res.status(200).json({ url })
  } catch (err) {
    console.error('checkout session creation failed:', (err as Error).message, { orderId })
    res.status(500).json({ error: 'CHECKOUT_FAILED' })
  }
}
