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

/**
 * Maps a Call 1 classification to its required downstream action. Severity is already
 * resolved inside Call 1 (CRISIS > BDD > ED > AGING > MEDICAL > AGE > WEDDING), so this
 * is a pure 1:1 map. Exhaustive over SafetyClassification — adding a new flag without a
 * branch is a compile error.
 */
export function routeSafetyClassification(c: SafetyClassification): SafetyAction {
  switch (c) {
    case 'PASS':
      return 'CONTINUE'
    case 'FLAG_AGE':
      return 'REFUSE_AGE'
    case 'FLAG_CRISIS':
      return 'CRISIS_RESOURCES'
    case 'FLAG_BDD':
      return 'BDD_RESOURCES'
    case 'FLAG_ED':
      return 'MODIFIED_ED'
    case 'FLAG_AGING':
      return 'MODIFIED_AGING'
    case 'FLAG_MEDICAL':
      return 'MODIFIED_MEDICAL'
    case 'FLAG_WEDDING':
      return 'WEDDING_WAITLIST'
  }
}
