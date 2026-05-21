import { describe, it, expect } from 'vitest'
import { isExpired, PHOTO_TTL_DAYS } from '../../src/photos/deletion'

// 30-day photo TTL (CLAUDE.md §2 rule 4, PRD §5.3). RED until deletion.ts is implemented.
describe('photo TTL', () => {
  it('uses a 30-day TTL', () => {
    expect(PHOTO_TTL_DAYS).toBe(30)
  })

  it('treats photos older than 30 days as expired', () => {
    const uploaded = new Date('2026-01-01T00:00:00Z')
    const now = new Date('2026-03-01T00:00:00Z') // ~59 days later
    expect(isExpired(uploaded, now)).toBe(true)
  })

  it('keeps photos still within the 30-day window', () => {
    const uploaded = new Date('2026-05-01T00:00:00Z')
    const now = new Date('2026-05-10T00:00:00Z') // 9 days later
    expect(isExpired(uploaded, now)).toBe(false)
  })
})
