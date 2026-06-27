import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BlockedSeamError } from '../../src/fulfillment/run'

const mockEmailsSend = vi.fn()
vi.mock('resend', () => ({
  // function (not arrow) so it is constructable under `new Resend()` in vitest 4.
  Resend: vi.fn(function () {
    return { emails: { send: mockEmailsSend } }
  }),
}))

beforeEach(() => {
  mockEmailsSend.mockReset()
  mockEmailsSend.mockResolvedValue({ id: 'email_test' })
  vi.stubEnv('RESEND_API_KEY', 'resend_test')
  vi.stubEnv('VERCEL_URL', 'glowrank.vercel.app')
})

const { sendEmailViaCopy } = await import('../../src/email/send')

describe('sendEmailViaCopy', () => {
  it('sends report_delivery with correct subject', async () => {
    await sendEmailViaCopy({ kind: 'report_delivery', to: 'user@example.com', reportId: 'rpt-123' })
    expect(mockEmailsSend).toHaveBeenCalledOnce()
    const call = mockEmailsSend.mock.calls[0][0] as { subject: string; to: string }
    expect(call.subject).toBe('Your GlowRank report is ready')
    expect(call.to).toBe('user@example.com')
  })

  it('includes report URL in HTML body', async () => {
    await sendEmailViaCopy({ kind: 'report_delivery', to: 'user@example.com', reportId: 'rpt-456' })
    const call = mockEmailsSend.mock.calls[0][0] as { html: string }
    expect(call.html).toContain('rpt-456')
    expect(call.html).toContain('glowrank.vercel.app')
  })

  it('attaches PDF when pdfBytes provided', async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46])
    await sendEmailViaCopy(
      { kind: 'report_delivery', to: 'user@example.com', reportId: 'rpt-789' },
      pdfBytes,
    )
    const call = mockEmailsSend.mock.calls[0][0] as { attachments: unknown[] }
    expect(call.attachments).toHaveLength(1)
  })

  it('sends without attachment when pdfBytes is undefined', async () => {
    await sendEmailViaCopy({ kind: 'report_delivery', to: 'user@example.com', reportId: 'rpt-000' })
    const call = mockEmailsSend.mock.calls[0][0] as { attachments?: unknown }
    expect(call.attachments).toBeUndefined()
  })

  it('throws BlockedSeamError for crisis_resources (copy missing)', async () => {
    await expect(
      sendEmailViaCopy({ kind: 'crisis_resources', to: 'user@example.com' }),
    ).rejects.toBeInstanceOf(BlockedSeamError)
  })

  it('throws BlockedSeamError for bdd_resources (copy missing)', async () => {
    await expect(
      sendEmailViaCopy({ kind: 'bdd_resources', to: 'user@example.com' }),
    ).rejects.toBeInstanceOf(BlockedSeamError)
  })

  it('throws BlockedSeamError for wedding_waitlist (copy missing)', async () => {
    await expect(
      sendEmailViaCopy({ kind: 'wedding_waitlist', to: 'user@example.com' }),
    ).rejects.toBeInstanceOf(BlockedSeamError)
  })

  it('throws BlockedSeamError for hard_fail_apology (copy missing)', async () => {
    await expect(
      sendEmailViaCopy({ kind: 'hard_fail_apology', to: 'user@example.com' }),
    ).rejects.toBeInstanceOf(BlockedSeamError)
  })
})
