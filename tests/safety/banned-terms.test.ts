import { describe, it, expect } from 'vitest'
import { containsBannedContent } from '../../src/safety/banned-terms'

// Deterministic backstop (CLAUDE.md §2 rule 6). It must catch context-independent banned
// terms AND must NOT false-positive on legitimate style copy (the context-dependent terms
// are left to the Call 5 judge on purpose).
describe('banned content scan — catches', () => {
  it('flags a universal banned term', () => {
    const result = containsBannedContent('honestly you just look ugly in these')
    expect(result.banned).toBe(true)
    expect(result.matches).toContain('ugly')
  })

  it('flags multi-word and hyphenated terms (whitespace/hyphen flexible)', () => {
    expect(containsBannedContent('your bad bone structure').matches).toContain('bad bone structure')
    expect(containsBannedContent('an anti-aging serum').matches).toContain('anti-aging')
    expect(containsBannedContent('try a bone-smash routine').matches).toContain('bone smash')
  })

  it('flags looksmaxxing jargon and aging-panic phrases', () => {
    expect(containsBannedContent('improve your canthal tilt').banned).toBe(true)
    expect(containsBannedContent('makeup to look younger-looking').banned).toBe(true)
    expect(containsBannedContent('reduce your turkey neck').banned).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(containsBannedContent('UGLY and HIDEOUS').matches).toEqual(
      expect.arrayContaining(['ugly', 'hideous']),
    )
  })

  it('flags buccal fat (a banned anatomical/procedure term)', () => {
    expect(containsBannedContent('your buccal fat').matches).toContain('buccal fat')
  })
})

describe('banned content scan — does NOT false-positive on legitimate copy', () => {
  it('passes clean, kind text', () => {
    const result = containsBannedContent('Your photos have warm, natural lighting.')
    expect(result.banned).toBe(false)
    expect(result.matches).toHaveLength(0)
  })

  it('allows "skinny jeans" (skinny is left to the judge, not scanned here)', () => {
    expect(containsBannedContent('a pair of skinny jeans works well').banned).toBe(false)
  })

  it('allows "midi skirt" and "midtone"', () => {
    expect(containsBannedContent('a midi skirt in a soft midtone').banned).toBe(false)
  })

  it('allows "fatty acids" and "beta version" style words', () => {
    expect(containsBannedContent('look for fatty acids in your moisturizer').banned).toBe(false)
    expect(containsBannedContent('a confident, alpha presence').banned).toBe(false)
  })

  it('does not flag substrings inside larger words (whole-word matching)', () => {
    // "ugly" should not match inside "ugliness"; that nuance is the judge's job.
    expect(containsBannedContent('there is a quiet ugliness theme in art').banned).toBe(false)
  })
})
