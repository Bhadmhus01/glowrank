import { describe, it, expect } from 'vitest'
import { containsBannedContent } from '../../src/safety/banned-terms'

// Banned content is banned, not minimized (CLAUDE.md §2 rule 6). RED until the
// term lists are filled verbatim from docs/Trust_Safety.md and the scan is implemented.
describe('banned content scan', () => {
  it('flags a universal banned term', () => {
    const result = containsBannedContent('honestly you just look ugly in these')
    expect(result.banned).toBe(true)
    expect(result.matches).toContain('ugly')
  })

  it('passes clean, kind text', () => {
    const result = containsBannedContent('Your photos have warm, natural lighting.')
    expect(result.banned).toBe(false)
    expect(result.matches).toHaveLength(0)
  })
})
