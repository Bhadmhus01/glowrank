import { Resend } from 'resend'
import type { EmailPayload } from '../fulfillment/run'
import { BlockedSeamError } from '../fulfillment/run'
import { reportDeliveryTemplate } from './templates'

// Email delivery via Resend (CLAUDE.md §4).
// All copy is verbatim from docs/Landing_Copy.md via templates.ts (CLAUDE.md §2 rule 2).
// Email addresses are never written to plaintext logs (CLAUDE.md §9).

let _client: Resend | null = null

function getResendClient(): Resend {
  if (_client === null) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error('RESEND_API_KEY is not set')
    _client = new Resend(apiKey)
  }
  return _client
}

function reportUrl(reportId: string): string {
  const host = process.env.VERCEL_URL ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  return `${protocol}://${host}/api/report/${reportId}`
}

/**
 * Sends a transactional email for the given payload.
 * pdfBytes: optional PDF attachment for report_delivery — included if provided.
 *
 * Throws BlockedSeamError for email kinds whose copy is not yet in Landing_Copy.md.
 */
export async function sendEmailViaCopy(
  payload: EmailPayload,
  pdfBytes?: Uint8Array,
): Promise<void> {
  const from = process.env.EMAIL_FROM ?? 'GlowRank <noreply@glowrank.co>'

  switch (payload.kind) {
    case 'report_delivery': {
      const url = reportUrl(payload.reportId)
      const { subject, html } = reportDeliveryTemplate({
        reportUrl: url,
        pdfAttached: pdfBytes !== undefined,
      })
      await getResendClient().emails.send({
        from,
        to: payload.to,
        subject,
        html,
        ...(pdfBytes !== undefined
          ? {
              attachments: [
                { filename: 'your-glowrank-report.pdf', content: Buffer.from(pdfBytes) },
              ],
            }
          : {}),
      })
      return
    }
    case 'crisis_resources':
    case 'bdd_resources':
    case 'wedding_waitlist':
    case 'hard_fail_apology':
      // Copy for these emails is not yet in docs/Landing_Copy.md (FOLLOWUPS M6).
      // Per CLAUDE.md §2 rule 2, we must not invent it.
      throw new BlockedSeamError(`EMAIL_COPY_MISSING: ${payload.kind}`)
  }
}
