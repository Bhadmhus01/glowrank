import { describe, it, expect } from 'vitest'
import { routeSafetyClassification } from '../../src/safety/routing'

// Call 1 routing (docs/Prompt_Chain.md "Call 1 → Routing logic"). RED until implemented.
describe('safety routing', () => {
  it('routes PASS to CONTINUE', () => {
    expect(routeSafetyClassification('PASS')).toBe('CONTINUE')
  })

  it('routes FLAG_AGE to a hard age refusal', () => {
    expect(routeSafetyClassification('FLAG_AGE')).toBe('REFUSE_AGE')
  })

  it('routes FLAG_CRISIS to crisis resources', () => {
    expect(routeSafetyClassification('FLAG_CRISIS')).toBe('CRISIS_RESOURCES')
  })

  it('routes FLAG_WEDDING to the waitlist', () => {
    expect(routeSafetyClassification('FLAG_WEDDING')).toBe('WEDDING_WAITLIST')
  })
})
