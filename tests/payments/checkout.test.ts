import { describe, it, expect, vi, afterEach } from 'vitest'
import type Stripe from 'stripe'
import {
  createCheckoutSession,
  checkoutConfigFromEnv,
  PRODUCT_NAME,
  PRICE_UNIT_AMOUNT,
  PRICE_CURRENCY,
  type CheckoutConfig,
} from '../../src/payments/checkout'

type CreateParams = Stripe.Checkout.SessionCreateParams
type CreateOpts = { idempotencyKey?: string }

function fakeStripe(
  result: () => { id: string; url: string | null },
): { stripe: Stripe; calls: Array<{ params: CreateParams; opts: CreateOpts | undefined }> } {
  const calls: Array<{ params: CreateParams; opts: CreateOpts | undefined }> = []
  const stripe = {
    checkout: {
      sessions: {
        create: vi.fn((params: CreateParams, opts?: CreateOpts) => {
          calls.push({ params, opts })
          return Promise.resolve(result())
        }),
      },
    },
  } as unknown as Stripe
  return { stripe, calls }
}

const CONFIG: CheckoutConfig = { successUrl: 'https://x/success', cancelUrl: 'https://x/cancel' }

describe('createCheckoutSession', () => {
  it('creates a payment-mode session with inline price_data when no priceId', async () => {
    const { stripe, calls } = fakeStripe(() => ({ id: 'cs_1', url: 'https://checkout/cs_1' }))
    const res = await createCheckoutSession(stripe, 'order_123', CONFIG)

    expect(res).toEqual({ id: 'cs_1', url: 'https://checkout/cs_1' })
    const { params, opts } = calls[0]
    expect(params.mode).toBe('payment')
    // The webhook reads either of these to map the PAID event back to the order.
    expect(params.client_reference_id).toBe('order_123')
    expect(params.metadata?.order_id).toBe('order_123')
    expect(params.success_url).toBe('https://x/success')
    expect(params.cancel_url).toBe('https://x/cancel')

    const li = params.line_items?.[0]
    expect(li?.quantity).toBe(1)
    expect(li?.price_data?.unit_amount).toBe(PRICE_UNIT_AMOUNT)
    expect(li?.price_data?.currency).toBe(PRICE_CURRENCY)
    expect(li?.price_data?.product_data?.name).toBe(PRODUCT_NAME)

    // Idempotent per order id — a double-submit returns the same session, not a duplicate.
    expect(opts?.idempotencyKey).toBe('checkout_order_123')
  })

  it('uses a pre-created price when priceId is set (no inline price_data)', async () => {
    const { stripe, calls } = fakeStripe(() => ({ id: 'cs_2', url: 'https://checkout/cs_2' }))
    await createCheckoutSession(stripe, 'order_9', { ...CONFIG, priceId: 'price_abc' })

    const li = calls[0].params.line_items?.[0]
    expect(li?.price).toBe('price_abc')
    expect(li?.price_data).toBeUndefined()
  })

  it('enforces $9.99 USD one-time pricing (Landing_Copy §6.1)', () => {
    expect(PRICE_UNIT_AMOUNT).toBe(999)
    expect(PRICE_CURRENCY).toBe('usd')
  })

  it('throws when Stripe returns a session without a redirect URL', async () => {
    const { stripe } = fakeStripe(() => ({ id: 'cs_3', url: null }))
    await expect(createCheckoutSession(stripe, 'order_x', CONFIG)).rejects.toThrow(/NO_URL/)
  })
})

describe('checkoutConfigFromEnv', () => {
  const ORIGINAL = { ...process.env }
  afterEach(() => {
    process.env = { ...ORIGINAL }
  })

  it('derives default URLs from the host and embeds the session-id placeholder', () => {
    process.env.VERCEL_URL = 'glowrank.example'
    delete process.env.CHECKOUT_SUCCESS_URL
    delete process.env.CHECKOUT_CANCEL_URL
    delete process.env.STRIPE_PRICE_ID

    const cfg = checkoutConfigFromEnv()
    expect(cfg.successUrl).toContain('https://glowrank.example')
    expect(cfg.successUrl).toContain('{CHECKOUT_SESSION_ID}')
    expect(cfg.cancelUrl).toContain('https://glowrank.example')
    expect(cfg.priceId).toBeUndefined()
  })

  it('picks up STRIPE_PRICE_ID and explicit success/cancel URLs when present', () => {
    process.env.CHECKOUT_SUCCESS_URL = 'https://glowrank.co/done'
    process.env.CHECKOUT_CANCEL_URL = 'https://glowrank.co/back'
    process.env.STRIPE_PRICE_ID = 'price_env'

    const cfg = checkoutConfigFromEnv()
    expect(cfg.successUrl).toBe('https://glowrank.co/done')
    expect(cfg.cancelUrl).toBe('https://glowrank.co/back')
    expect(cfg.priceId).toBe('price_env')
  })
})
