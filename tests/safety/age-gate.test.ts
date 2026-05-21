import { describe, it, expect } from 'vitest'
import { isAgeEligible, MINIMUM_AGE } from '../../src/safety/age-gate'

// The age gate is a hard, non-bypassable gate (CLAUDE.md §2 rule 5). These tests
// are RED until age-gate.ts is implemented.
describe('age gate', () => {
  it('exposes a minimum age of 18', () => {
    expect(MINIMUM_AGE).toBe(18)
  })

  it('refuses users under 18', () => {
    expect(isAgeEligible(17)).toBe(false)
    expect(isAgeEligible(13)).toBe(false)
  })

  it('allows users 18 and over', () => {
    expect(isAgeEligible(18)).toBe(true)
    expect(isAgeEligible(45)).toBe(true)
  })

  it('refuses invalid / impossible ages', () => {
    expect(isAgeEligible(0)).toBe(false)
    expect(isAgeEligible(-5)).toBe(false)
  })
})
