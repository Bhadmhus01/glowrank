import { randomUUID } from 'node:crypto'
import type { OrderStore } from '../orders/order-store'
import type { StorageClient } from '../photos/storage'
import type { ReportStore } from '../reports/report-store'
import type { AnalysisImage } from '../chain/call2-photo-analysis'
import type { GenerationInput, GenerationOutcome } from '../chain/orchestrator'
import type { FunnelEvent } from '../analytics/events'
import { planFulfillment, type FulfillmentPlan } from './plan'

// runGenerateForOrder is the M6 execution spine: load the order, fetch processed photo bytes,
// run the 5-call chain, decide fulfillment, then execute the side effects. Side effects whose
// adapters are still BLOCKED on a founder decision (email send — missing copy + provider;
// refund — not yet authorized) or on follow-up modules (manual-review queue, flagged-emails
// store) are injected as optional seams: if the plan demands one and the seam is absent, this
// throws BlockedSeamError. No user-facing copy is invented here (CLAUDE.md §2 rule 2). Real
// Anthropic / Stripe / Resend calls are NOT made from this module — every collaborator is
// injected, so it is fully unit-testable with mocks.

/**
 * Payload handed to the (blocked) email seam. The seam owns URL construction, copy lookup
 * (from docs/Landing_Copy.md), and provider transport — this module only forwards the kind,
 * recipient, and outcome-specific context (e.g. the delivered reportId).
 */
export type EmailPayload =
  | { kind: 'report_delivery'; to: string; reportId: string }
  | { kind: 'crisis_resources'; to: string }
  | { kind: 'bdd_resources'; to: string }
  | { kind: 'wedding_waitlist'; to: string }
  | { kind: 'hard_fail_apology'; to: string }

export interface ManualReviewContext {
  orderId: string
  outcome: GenerationOutcome
  plan: FulfillmentPlan
}

export interface GenerateDeps {
  orderStore: OrderStore
  storage: StorageClient
  reportStore: ReportStore
  /** The 5-call chain. Tests inject mocks; production wires src/chain/orchestrator.runChain. */
  runChain: (input: GenerationInput) => Promise<GenerationOutcome>
  /** BLOCKED seam — missing copy + provider (FOLLOWUPS M6). Throws if absent and required. */
  sendEmail?: (payload: EmailPayload) => Promise<void>
  /** BLOCKED seam — needs founder go-ahead (CLAUDE.md §7). Throws if absent and required. */
  refund?: (orderId: string) => Promise<void>
  /** Seam pending — manual-review queue module (FOLLOWUPS 3d). */
  enqueueManualReview?: (ctx: ManualReviewContext) => Promise<void>
  /** Seam pending — flagged-emails store (FOLLOWUPS 3e). */
  flagEmail?: (emailAddress: string) => Promise<void>
  /** Optional; defaults to no-op until the analytics provider is chosen (Plausible/PostHog). */
  track?: (event: FunnelEvent, props?: Record<string, string | number | boolean>) => void
  /** Injectable for tests; defaults to a random UUID. Non-guessable per PRD §3.2 Step 5. */
  newReportId?: () => string
  /** Injectable for tests; defaults to the current time. Stamps the fulfillment record. */
  now?: () => string
}

export interface GenerateResult {
  outcome: GenerationOutcome
  plan: FulfillmentPlan
  /** Present iff plan.deliverReport === true. */
  reportId?: string
  /** True when this order already reached a terminal outcome and was short-circuited (no re-run). */
  alreadyFulfilled?: boolean
}

export class BlockedSeamError extends Error {
  constructor(code: string, detail?: string) {
    super(detail !== undefined ? `${code}: ${detail}` : code)
    this.name = 'BlockedSeamError'
  }
}

export async function runGenerateForOrder(
  deps: GenerateDeps,
  orderId: string,
): Promise<GenerateResult> {
  const order = await deps.orderStore.get(orderId)
  if (order === null) {
    throw new Error(`ORDER_NOT_FOUND: ${orderId}`)
  }

  // Idempotency / replay: if this order already reached a terminal outcome, do NOT re-run the
  // chain. Stripe can re-send checkout.session.completed, and a manual replay re-POSTs here —
  // re-running would incur double AI cost and re-deliver. The plan is pure, so re-derive it from
  // the recorded outcome; the side effects already ran on the original pass. Only orders that
  // never reached a terminal outcome (early failure) re-run, which is exactly the recovery case.
  if (order.fulfillment) {
    const recorded = order.fulfillment
    return {
      outcome: recorded.outcome,
      plan: planFulfillment(recorded.outcome),
      ...(recorded.reportId !== undefined ? { reportId: recorded.reportId } : {}),
      alreadyFulfilled: true,
    }
  }

  // Fetch processed photo bytes in parallel — already EXIF-stripped and JPEG/PNG.
  const images: AnalysisImage[] = await Promise.all(
    order.photos.map(async (p) => {
      const fetched = await deps.storage.get(p.key)
      return { category: p.category, mediaType: fetched.contentType, bytes: fetched.bytes }
    }),
  )

  const outcome = await deps.runChain({ intake: order.intake, images })
  const plan = planFulfillment(outcome)
  const track = deps.track ?? ((): void => {})

  // 1. Deliver (save report markdown → its shareable id, served by api/report/[id]).
  let reportId: string | undefined
  if (plan.deliverReport && outcome.status === 'delivered') {
    reportId = (deps.newReportId ?? randomUUID)()
    await deps.reportStore.save(reportId, outcome.reportMarkdown)
  }

  // 2. Under-18 backstop: immediate, complete photo deletion (Trust_Safety §2.5).
  if (plan.deletePhotosImmediately) {
    await Promise.all(order.photos.map((p) => deps.storage.delete(p.key)))
  }

  // 3. Refund — touches payments (CLAUDE.md §7). Blocked until explicitly authorized.
  if (plan.refund) {
    if (deps.refund === undefined) {
      throw new BlockedSeamError('BLOCKED_REFUND_NOT_AUTHORIZED', `orderId=${orderId}`)
    }
    await deps.refund(orderId)
  }

  // 4. Email — copy comes from Landing_Copy.md only (CLAUDE.md §2 rule 2). Blocked until the
  //    missing copies exist (crisis / BDD / wedding-waitlist / hard-fail-apology) AND a
  //    provider is chosen. The seam, when wired, looks up copy by `kind`.
  if (plan.email !== 'none') {
    if (deps.sendEmail === undefined) {
      throw new BlockedSeamError('BLOCKED_EMAIL_SEND_NOT_WIRED', `kind=${plan.email}`)
    }
    await deps.sendEmail(buildEmailPayload(plan.email, order.intake.email, reportId))
  }

  // 5. Manual review — queue module pending (FOLLOWUPS 3d).
  if (plan.manualReview) {
    if (deps.enqueueManualReview === undefined) {
      throw new BlockedSeamError('BLOCKED_MANUAL_REVIEW_QUEUE_MISSING', 'TODO 3d')
    }
    await deps.enqueueManualReview({ orderId, outcome, plan })
  }

  // 6. Flag email to prevent re-purchase loops (Trust_Safety §2.1). Store pending (3e).
  if (plan.flagEmailToPreventRepurchase) {
    if (deps.flagEmail === undefined) {
      throw new BlockedSeamError('BLOCKED_FLAGGED_EMAIL_STORE_MISSING', 'TODO 3e')
    }
    await deps.flagEmail(order.intake.email)
  }

  // 7. Funnel events (PRD §9.1). Segment by gender; NO PII in props (CLAUDE.md §9).
  if (plan.deliverReport) track('report_delivered', { gender: order.intake.gender })
  if (plan.refund) track('refund_requested', { gender: order.intake.gender })

  // 8. Record the terminal outcome so a re-sent webhook / manual replay short-circuits above.
  //    reportMarkdown is redacted from the stored outcome (CLAUDE.md §9) — the report lives in
  //    the report store under reportId. Best-effort: a storage failure here must NOT 500 (the
  //    user already got their report); it only weakens idempotency for this one order.
  const now = deps.now ?? ((): string => new Date().toISOString())
  const recordedOutcome: GenerationOutcome =
    outcome.status === 'delivered' ? { ...outcome, reportMarkdown: '' } : outcome
  try {
    await deps.orderStore.markFulfilled?.(orderId, {
      outcome: recordedOutcome,
      ...(reportId !== undefined ? { reportId } : {}),
      at: now(),
    })
  } catch (err) {
    console.error('markFulfilled failed (order may re-run on retry):', (err as Error).message, {
      orderId,
    })
  }

  return { outcome, plan, ...(reportId !== undefined ? { reportId } : {}) }
}

function buildEmailPayload(
  kind: Exclude<FulfillmentPlan['email'], 'none'>,
  to: string,
  reportId: string | undefined,
): EmailPayload {
  switch (kind) {
    case 'report_delivery':
      // Upstream invariant: plan.email === 'report_delivery' implies plan.deliverReport,
      // which means we already minted a reportId above. Guard against the invariant breaking.
      if (reportId === undefined) {
        throw new Error('INTERNAL: report_delivery email requires a reportId')
      }
      return { kind: 'report_delivery', to, reportId }
    case 'crisis_resources':
    case 'bdd_resources':
    case 'wedding_waitlist':
    case 'hard_fail_apology':
      return { kind, to }
  }
}
