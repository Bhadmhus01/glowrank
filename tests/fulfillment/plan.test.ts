import { describe, it, expect } from 'vitest'
import { planFulfillment } from '../../src/fulfillment/plan'
import type { GenerationOutcome } from '../../src/chain/orchestrator'
import type { FilterResult } from '../../src/types'

const filter: FilterResult = {
  verdict: 'PASS',
  hardFailReasons: [],
  regenerateReasons: [],
  toneScores: { warmth: 8, specificity: 8, agency: 8, motivation: 8 },
  structuralCheck: {
    allSectionsPresent: true,
    disclaimersPresent: true,
    makeupCorrectlyPresentOrAbsent: true,
    wordCount: 2100,
  },
  notesForRegeneration: '',
}

describe('planFulfillment', () => {
  it('delivered → deliver + delivery email, no refund', () => {
    const outcome: GenerationOutcome = { status: 'delivered', reportMarkdown: '# r', filter }
    expect(planFulfillment(outcome)).toMatchObject({
      deliverReport: true,
      refund: false,
      email: 'report_delivery',
    })
  })

  it('under-18 refusal → refund + delete photos immediately', () => {
    const outcome: GenerationOutcome = { status: 'refused', classification: 'FLAG_AGE', action: 'REFUSE_AGE' }
    expect(planFulfillment(outcome)).toMatchObject({
      refund: true,
      deletePhotosImmediately: true,
      deliverReport: false,
    })
  })

  it('crisis refusal → refund + crisis resources + manual review', () => {
    const outcome: GenerationOutcome = { status: 'refused', classification: 'FLAG_CRISIS', action: 'CRISIS_RESOURCES' }
    expect(planFulfillment(outcome)).toMatchObject({
      refund: true,
      manualReview: true,
      email: 'crisis_resources',
    })
  })

  it('BDD refusal → refund + bdd resources + flag email to prevent re-purchase', () => {
    const outcome: GenerationOutcome = { status: 'refused', classification: 'FLAG_BDD', action: 'BDD_RESOURCES' }
    expect(planFulfillment(outcome)).toMatchObject({
      refund: true,
      flagEmailToPreventRepurchase: true,
      email: 'bdd_resources',
    })
  })

  it('wedding refusal → refund + waitlist email', () => {
    const outcome: GenerationOutcome = { status: 'refused', classification: 'FLAG_WEDDING', action: 'WEDDING_WAITLIST' }
    expect(planFulfillment(outcome)).toMatchObject({ refund: true, email: 'wedding_waitlist' })
  })

  it('held (ED/MEDICAL/AGING) → manual review, NOT refunded, NOT delivered', () => {
    const outcome: GenerationOutcome = { status: 'held', classification: 'FLAG_ED', action: 'MODIFIED_ED' }
    expect(planFulfillment(outcome)).toMatchObject({
      manualReview: true,
      refund: false,
      deliverReport: false,
    })
  })

  it('hard_fail → refund + apology + manual review, never delivered', () => {
    const outcome: GenerationOutcome = { status: 'hard_fail', reasons: ['banned term'] }
    expect(planFulfillment(outcome)).toMatchObject({
      refund: true,
      manualReview: true,
      email: 'hard_fail_apology',
      deliverReport: false,
    })
  })
})
