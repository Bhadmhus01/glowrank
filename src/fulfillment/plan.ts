import type { GenerationOutcome } from '../chain/orchestrator'

// Maps a chain outcome to the post-generation actions required by PRD §3 +
// Trust_Safety §2/§6. PURE and side-effect-free: it decides WHAT must happen; executing
// it (Stripe refund, email with copy from Landing_Copy.md, PDF, report storage, analytics)
// is the deferred adapter layer (FOLLOWUPS M6). `email` is a TYPE, never copy.

export type FulfillmentEmail =
  | 'report_delivery'
  | 'crisis_resources'
  | 'bdd_resources'
  | 'wedding_waitlist'
  | 'hard_fail_apology'
  | 'none'

export interface FulfillmentPlan {
  deliverReport: boolean
  refund: boolean
  /** Immediate deletion (vs. the 30-day TTL) — mandated for the under-18 gate. */
  deletePhotosImmediately: boolean
  /** Flag the email to prevent re-purchase loops (Trust_Safety §2.1). */
  flagEmailToPreventRepurchase: boolean
  manualReview: boolean
  email: FulfillmentEmail
}

const BASE: FulfillmentPlan = {
  deliverReport: false,
  refund: false,
  deletePhotosImmediately: false,
  flagEmailToPreventRepurchase: false,
  manualReview: false,
  email: 'none',
}

/** Decides the post-generation actions for an outcome. No side effects. */
export function planFulfillment(outcome: GenerationOutcome): FulfillmentPlan {
  switch (outcome.status) {
    case 'delivered':
      return { ...BASE, deliverReport: true, email: 'report_delivery' }

    case 'hard_fail':
      // Refund + manual review queue (Trust_Safety §6.2).
      return { ...BASE, refund: true, manualReview: true, email: 'hard_fail_apology' }

    case 'held':
      // Owed a MODIFIED report we can't generate yet (M5). Hold for manual handling —
      // do not refund (the report is still owed) and do not deliver a standard report.
      return { ...BASE, manualReview: true }

    case 'refused':
      switch (outcome.action) {
        case 'REFUSE_AGE':
          // Under-18 backstop: refund + delete photos immediately (Trust_Safety §2.5).
          return { ...BASE, refund: true, deletePhotosImmediately: true }
        case 'CRISIS_RESOURCES':
          return { ...BASE, refund: true, manualReview: true, email: 'crisis_resources' }
        case 'BDD_RESOURCES':
          return {
            ...BASE,
            refund: true,
            manualReview: true,
            flagEmailToPreventRepurchase: true,
            email: 'bdd_resources',
          }
        case 'WEDDING_WAITLIST':
          return { ...BASE, refund: true, email: 'wedding_waitlist' }
        // These actions never reach a 'refused' outcome (CONTINUE proceeds; MODIFIED_* are
        // 'held'), but the switch must be exhaustive — treat any surprise conservatively.
        case 'CONTINUE':
        case 'MODIFIED_ED':
        case 'MODIFIED_AGING':
        case 'MODIFIED_MEDICAL':
          return { ...BASE, manualReview: true }
      }
  }
}
