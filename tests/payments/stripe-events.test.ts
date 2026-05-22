import { describe, it, expect, vi } from 'vitest'
import type Stripe from 'stripe'
import { verifyStripeEvent, routeStripeEvent } from '../../src/payments/stripe'

function fakeStripe(constructEvent: () => Stripe.Event): Stripe {
  return { webhooks: { constructEvent: vi.fn(constructEvent) } } as unknown as Stripe
}

describe('verifyStripeEvent', () => {
  it('returns the event when the signature verifies', () => {
    const event = { type: 'checkout.session.completed' } as Stripe.Event
    expect(verifyStripeEvent('raw', 'sig', 'whsec_x', fakeStripe(() => event))).toBe(event)
  })

  it('throws when the signature is invalid (caller must 400)', () => {
    const stripe = fakeStripe(() => {
      throw new Error('No signatures found matching the expected signature for payload')
    })
    expect(() => verifyStripeEvent('raw', 'bad', 'whsec_x', stripe)).toThrow(/signature/i)
  })
})

describe('routeStripeEvent', () => {
  function completed(over: Record<string, unknown>): Stripe.Event {
    return {
      type: 'checkout.session.completed',
      data: { object: { payment_status: 'paid', client_reference_id: 'order_123', ...over } },
    } as unknown as Stripe.Event
  }

  it('triggers generation for a paid checkout carrying an order reference', () => {
    expect(routeStripeEvent(completed({}))).toEqual({ kind: 'generate', orderRef: 'order_123' })
  })

  it('falls back to metadata.order_id for the reference', () => {
    expect(
      routeStripeEvent(completed({ client_reference_id: null, metadata: { order_id: 'order_meta' } })),
    ).toEqual({ kind: 'generate', orderRef: 'order_meta' })
  })

  it('ignores a checkout without any order reference', () => {
    expect(routeStripeEvent(completed({ client_reference_id: null, metadata: null })).kind).toBe('ignore')
  })

  it('ignores an unpaid checkout', () => {
    expect(routeStripeEvent(completed({ payment_status: 'unpaid' })).kind).toBe('ignore')
  })

  it('ignores unrelated event types', () => {
    expect(routeStripeEvent({ type: 'invoice.paid' } as Stripe.Event).kind).toBe('ignore')
  })
})
