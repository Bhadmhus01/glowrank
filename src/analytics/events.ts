import { PostHog } from 'posthog-node'
import { randomUUID } from 'node:crypto'

// Funnel events (PRD §9.1 / CLAUDE.md §9). All events are segmented by gender.
// Privacy-friendly analytics — PostHog (CLAUDE.md §4). Props must contain NO PII.

export type FunnelEvent =
  | 'landing_visit'
  | 'cta_clicked'
  | 'intake_started'
  | 'gender_selected'
  | 'makeup_optin'
  | 'photos_uploaded'
  | 'checkout_started'
  | 'payment_success'
  | 'report_delivered'
  | 'upsell_shown'
  | 'upsell_purchased'
  | 'nps_submitted'
  | 'refund_requested'

let _client: PostHog | null = null

function getClient(): PostHog {
  if (_client === null) {
    const apiKey = process.env.POSTHOG_API_KEY
    if (!apiKey) throw new Error('POSTHOG_API_KEY is not set')
    _client = new PostHog(apiKey, {
      host: process.env.POSTHOG_HOST ?? 'https://app.posthog.com',
      // Flush immediately in serverless — process may exit before the default batch fires.
      flushAt: 1,
      flushInterval: 0,
    })
  }
  return _client
}

/**
 * Records a funnel event. Props must contain NO PII — no email, no free-text,
 * no anything that reconstructs appearance (CLAUDE.md §9).
 * No-op if POSTHOG_API_KEY is not configured (safe in dev/test without env vars).
 */
export function track(
  event: FunnelEvent,
  props?: Record<string, string | number | boolean>,
): void {
  if (!process.env.POSTHOG_API_KEY) return
  try {
    // Each server-side event gets a random distinctId — account-less product (CLAUDE.md §4).
    getClient().capture({ distinctId: randomUUID(), event, ...(props !== undefined ? { properties: props } : {}) })
  } catch {
    // Never throw from analytics — a tracking failure must not block the delivery flow.
  }
}
