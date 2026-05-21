import type { SafetyClassification } from '../types'

/** Downstream action for a Call 1 classification (docs/Prompt_Chain.md "Call 1 → Routing logic"). */
export type SafetyAction =
  | 'CONTINUE' //          PASS → proceed to Call 2
  | 'REFUSE_AGE' //        FLAG_AGE → hard refusal, refund, age-verification page
  | 'CRISIS_RESOURCES' //  FLAG_CRISIS → crisis resource page, refund, follow-up
  | 'BDD_RESOURCES' //     FLAG_BDD → BDD resource page, refund, follow-up
  | 'MODIFIED_ED' //       FLAG_ED → modified report (no body composition), ED resources
  | 'MODIFIED_AGING' //    FLAG_AGING → modified tone (no anti-aging language)
  | 'MODIFIED_MEDICAL' //  FLAG_MEDICAL → modified report, dermatologist referral
  | 'WEDDING_WAITLIST' //  FLAG_WEDDING → kind waitlist page, refund

/** Maps a Call 1 classification to its required downstream action. */
export function routeSafetyClassification(c: SafetyClassification): SafetyAction {
  throw new Error('NOT_IMPLEMENTED: safety routing')
}
