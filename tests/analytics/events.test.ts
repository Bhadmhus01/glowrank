import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCapture = vi.fn()
vi.mock('posthog-node', () => ({
  // function (not arrow) so it is constructable under `new PostHog()` in vitest 4.
  PostHog: vi.fn(function () {
    return { capture: mockCapture }
  }),
}))

// Import after mock
const { track } = await import('../../src/analytics/events')

beforeEach(() => {
  mockCapture.mockReset()
  vi.stubEnv('POSTHOG_API_KEY', 'phc_testkey')
})

describe('track', () => {
  it('calls PostHog capture with the event name', () => {
    track('report_delivered', { gender: 'man' })
    expect(mockCapture).toHaveBeenCalledOnce()
    const call = mockCapture.mock.calls[0][0] as { event: string; properties: unknown }
    expect(call.event).toBe('report_delivered')
    expect(call.properties).toEqual({ gender: 'man' })
  })

  it('uses a random distinctId (no PII)', () => {
    track('payment_success')
    const call = mockCapture.mock.calls[0][0] as { distinctId: string }
    expect(typeof call.distinctId).toBe('string')
    expect(call.distinctId).not.toContain('@')
  })

  it('is a no-op when POSTHOG_API_KEY is not set', () => {
    vi.stubEnv('POSTHOG_API_KEY', '')
    track('report_delivered')
    expect(mockCapture).not.toHaveBeenCalled()
  })

  it('does not throw if PostHog capture throws', () => {
    mockCapture.mockImplementation(() => {
      throw new Error('posthog down')
    })
    expect(() => track('refund_requested')).not.toThrow()
  })
})
