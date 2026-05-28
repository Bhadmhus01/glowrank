import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IntakeJson, Observations, Scores, Framing } from '../../src/types'

vi.mock('../../src/chain/anthropic', () => ({
  createTextMessage: vi.fn(),
}))

import { createTextMessage } from '../../src/chain/anthropic'
import { runReportGeneration } from '../../src/chain/call4-report-generation'

const mockedText = vi.mocked(createTextMessage)

const dim = { observations: ['o'], strengths: ['s'], opportunities: ['p'] }
const obs: Observations = {
  grooming: dim,
  skin: dim,
  wardrobe: { ...dim, gaps: [] },
  photos: dim,
  bodyLanguage: dim,
  profile: null,
  makeup: null,
  specificDetails: ['a', 'b', 'c'],
}
const obsMakeup: Observations = { ...obs, makeup: { ...dim, undertone: 'warm' } }

const ds = (score: number, framing: Framing) => ({ score, framing })
const priority = { dimension: 'photos', reason: 'r', expectedImpact: 'i' }
const scores: Scores = {
  scores: {
    grooming: ds(7, 'high opportunity'),
    skin: ds(5, 'moderate opportunity'),
    wardrobe: ds(8, 'high opportunity'),
    photos: ds(9, 'highest opportunity'),
    bodyLanguage: ds(4, 'already strong'),
    profile: null,
    makeup: null,
  },
  topThreePriorities: [priority, priority, priority],
}

const womanIntake: IntakeJson = {
  age: 36,
  gender: 'woman',
  goal: 'new-chapter',
  budgetTier: '300-1000',
  heightCm: 170,
  bodyType: 'average',
  stylePreferences: ['classic'],
  makeupOptin: true,
  skinUndertone: 'warm',
  email: 'maya@example.com',
}
const manIntake: IntakeJson = {
  age: 26,
  gender: 'man',
  goal: 'dating',
  budgetTier: '100-300',
  heightCm: 178,
  bodyType: 'athletic',
  stylePreferences: ['smart-casual'],
  makeupOptin: false,
  email: 'daniel@example.com',
}

beforeEach(() => {
  mockedText.mockReset()
})

describe('Call 4 — report generation', () => {
  it('returns the generated markdown, trimmed', async () => {
    mockedText.mockResolvedValue('  # Your GlowRank Report\n\nHi.  ')
    const out = await runReportGeneration(manIntake, obs, scores)
    expect(out).toBe('# Your GlowRank Report\n\nHi.')
  })

  it('uses the Opus model', async () => {
    mockedText.mockResolvedValue('# report')
    await runReportGeneration(manIntake, obs, scores)
    expect(mockedText.mock.calls[0]![0].model).toMatch(/opus/)
  })

  it('lists makeup as an active section only when opted in WITH makeup observations', async () => {
    mockedText.mockResolvedValue('# report')
    await runReportGeneration(womanIntake, obsMakeup, scores)
    expect(mockedText.mock.calls[0]![0].userContent).toContain(
      'Active sections to include: grooming, skin, wardrobe, photos, body language, makeup',
    )
  })

  it('omits makeup from active sections when not opted in', async () => {
    mockedText.mockResolvedValue('# report')
    await runReportGeneration(manIntake, obs, scores)
    const uc = mockedText.mock.calls[0]![0].userContent
    expect(uc).toContain('Active sections to include: grooming, skin, wardrobe, photos, body language')
    expect(uc).not.toContain(', makeup')
  })

  it('includes regeneration notes (and the REVISION marker) only when provided', async () => {
    mockedText.mockResolvedValue('# report')
    await runReportGeneration(manIntake, obs, scores, 'Intro lacks a specific photo detail.')
    const withNotes = mockedText.mock.calls[0]![0].userContent
    expect(withNotes).toContain('REVISION REQUIRED')
    expect(withNotes).toContain('Intro lacks a specific photo detail.')

    mockedText.mockReset()
    mockedText.mockResolvedValue('# report')
    await runReportGeneration(manIntake, obs, scores)
    expect(mockedText.mock.calls[0]![0].userContent).not.toContain('REVISION REQUIRED')
  })
})
