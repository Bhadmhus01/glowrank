import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRefundsCreate = vi.fn()
vi.mock('stripe', () => ({
  // function (not arrow) so it is constructable under `new Stripe()` in vitest 4.
  default: vi.fn(function () {
    return { refunds: { create: mockRefundsCreate } }
  }),
}))

beforeEach(() => {
  mockRefundsCreate.mockReset()
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fake')
})

const { refundOrder } = await import('../../src/payments/refund')

describe('refundOrder', () => {
  it('calls stripe.refunds.create with the paymentIntentId', async () => {
    mockRefundsCreate.mockResolvedValue({ id: 're_test' })
    await refundOrder('pi_abc123')
    expect(mockRefundsCreate).toHaveBeenCalledWith({ payment_intent: 'pi_abc123' })
  })

  it('propagates Stripe errors', async () => {
    mockRefundsCreate.mockRejectedValue(new Error('card_declined'))
    await expect(refundOrder('pi_bad')).rejects.toThrow('card_declined')
  })
})
