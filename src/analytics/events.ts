// Funnel events (PRD §9.1 / CLAUDE.md §9). All events are segmented by gender.
// Privacy-friendly analytics only (Plausible or PostHog — CLAUDE.md §4).

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

/**
 * Records a funnel event. Props must contain NO PII — no email, no free-text,
 * no anything that reconstructs appearance (CLAUDE.md §9).
 */
export function track(
  event: FunnelEvent,
  props?: Record<string, string | number | boolean>,
): void {
  throw new Error('NOT_IMPLEMENTED: analytics tracking')
}
