import type Stripe from 'stripe'

// Creates a hosted Stripe Checkout Session for a previously-created order (CLAUDE.md §4:
// Stripe Checkout, hosted — not embedded). This module never touches raw card data and never
// charges directly: Stripe's hosted page collects payment. The created session carries the
// order id as `client_reference_id` (and `metadata.order_id`) so api/stripe-webhook.ts can map
// the PAID event back to the stored intake + photos (see src/orders/order-store.ts and
// src/payments/stripe.ts routeStripeEvent, which reads either field).
//
// Product name + price are VERBATIM from docs/Landing_Copy.md §6.1 (CLAUDE.md §2 rule 2):
//   Product name: "GlowRank — Personalized Glow-Up Report"
//   Price:        $9.99 USD, one-time.
// These are documented config, not generated copy — do not change without founder approval.
// PRD §3 Step 3: no subscription, no upsell during checkout.

export const PRODUCT_NAME = 'GlowRank — Personalized Glow-Up Report'
export const PRICE_UNIT_AMOUNT = 999 // $9.99 expressed in cents
export const PRICE_CURRENCY = 'usd'

export interface CheckoutConfig {
  /** Where Stripe sends the browser after a successful payment. */
  successUrl: string
  /** Where Stripe sends the browser if the user abandons checkout. */
  cancelUrl: string
  /** Optional pre-created Stripe Price ID. When set, used instead of inline price_data. */
  priceId?: string
}

/**
 * Builds checkout config from environment. Success/cancel URLs default to the deploy host;
 * a pre-created Stripe Price ID is used when STRIPE_PRICE_ID is set (recommended for prod).
 */
export function checkoutConfigFromEnv(): CheckoutConfig {
  const host = process.env.VERCEL_URL ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const base = `${protocol}://${host}`
  return {
    successUrl:
      process.env.CHECKOUT_SUCCESS_URL ?? `${base}/processing?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: process.env.CHECKOUT_CANCEL_URL ?? `${base}/?checkout=cancelled`,
    ...(process.env.STRIPE_PRICE_ID ? { priceId: process.env.STRIPE_PRICE_ID } : {}),
  }
}

/**
 * Creates a hosted Checkout Session for an order and returns its id + redirect URL.
 * The caller must verify the order exists before calling this (api/checkout.ts does).
 * Idempotent per order id: a retried request returns the same session (within Stripe's
 * idempotency-key window) rather than creating a duplicate.
 *
 * @throws if Stripe returns a session without a redirect URL.
 */
export async function createCheckoutSession(
  stripe: Stripe,
  orderId: string,
  config: CheckoutConfig,
): Promise<{ id: string; url: string }> {
  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = config.priceId
    ? { price: config.priceId, quantity: 1 }
    : {
        quantity: 1,
        price_data: {
          currency: PRICE_CURRENCY,
          unit_amount: PRICE_UNIT_AMOUNT,
          product_data: { name: PRODUCT_NAME },
        },
      }

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      line_items: [lineItem],
      // The webhook maps the PAID event back to the order via either of these.
      client_reference_id: orderId,
      metadata: { order_id: orderId },
      success_url: config.successUrl,
      cancel_url: config.cancelUrl,
      // Apple Pay / Google Pay (PRD §3 Step 3, Landing_Copy §6.1) are enabled automatically by
      // Stripe for card payments based on the dashboard's payment-method settings.
    },
    { idempotencyKey: `checkout_${orderId}` },
  )

  if (!session.url) {
    throw new Error('CHECKOUT_SESSION_NO_URL')
  }
  return { id: session.id, url: session.url }
}
