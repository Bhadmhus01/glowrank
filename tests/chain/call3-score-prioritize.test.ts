import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IntakeJson, Observations } from '../../src/types'

vi.mock('../../src/chain/anthropic', () => ({
  createTextMessage: vi.fn(),
}))

import { createTextMessage } from '../../src/chain/anthropic'
import { runScoreAndPrioritize } from '../../src/chain/call3-score-prioritize'

const mockedText = vi.mocked(createTextMessage)

const dim = { observations: ['o'], strengths: ['s'], opportunities: ['p'] }
const baseObs: Observations = {
  grooming: dim,
  skin: dim,
  wardrobe: { ...dim, gaps: ['blazer'] },
  photos: dim,
  bodyLanguage: dim,
  profile: null,
  makeup: null,
  specificDetails: ['a', 'b', 'c'],
}
const obsWithMakeup: Observations = { ...baseObs, makeup: { ...dim, undertone: 'warm' } }
const obsWithProfile: Observations = { ...baseObs, profile: dim }

const womanIntake: IntakeJson = {
  age: 36,
  gender: 'woman',
  goal: 'new-chapter',
  budgetTier: '300-1000',
  heightCm: 170,
  bodyType: 'average',
  stylePreferences: ['classic'],
  makeupOptin: true,
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

function scoresJson(
  opts: { withProfile?: boolean; withMakeup?: boolean; framing?: string; score?: number } = {},
) {
  const score = (n: number, f: string) => ({ score: n, framing: f })
  const obj: Record<string, unknown> = {
    scores: {
      grooming: score(opts.score ?? 7, opts.framing ?? 'high opportunity'),
      skin: score(5, 'moderate opportunity'),
      wardrobe: score(8, 'high opportunity'),
      photos: score(9, 'highest opportunity'),
      body_language: score(4, 'already strong'),
      profile: opts.withProfile ? score(7, 'high opportunity') : null,
      makeup: opts.withMakeup ? score(6, 'moderate opportunity') : null,
    },
    top_3_priorities: [
      { dimension: 'photos', reason: 'r', expected_impact: 'i' },
      { dimension: 'wardrobe', reason: 'r', expected_impact: 'i' },
      { dimension: 'grooming', reason: 'r', expected_impact: 'i' },
    ],
  }
  return JSON.stringify(obj)
}

beforeEach(() => {
  mockedText.mockReset()
})

describe('Call 3 — score & prioritization', () => {
  it('parses scores and maps body_language / expected_impact / top_3_priorities', async () => {
    mockedText.mockResolvedValue(scoresJson({ withMakeup: true }))
    const result = await runScoreAndPrioritize(womanIntake, obsWithMakeup)
    expect(result.scores.bodyLanguage.framing).toBe('already strong')
    expect(result.scores.photos.score).toBe(9)
    expect(result.scores.makeup?.score).toBe(6)
    expect(result.topThreePriorities).toHaveLength(3)
    expect(result.topThreePriorities[0].expectedImpact).toBe('i')
  })

  it('drops the makeup score when makeup was not an active observation', async () => {
    mockedText.mockResolvedValue(scoresJson({ withMakeup: true }))
    const result = await runScoreAndPrioritize(manIntake, baseObs) // no makeup obs
    expect(result.scores.makeup).toBeNull()
  })

  it('keeps profile score only when profile was an active observation', async () => {
    mockedText.mockResolvedValue(scoresJson({ withProfile: true }))
    expect((await runScoreAndPrioritize(manIntake, baseObs)).scores.profile).toBeNull()
    mockedText.mockResolvedValue(scoresJson({ withProfile: true }))
    expect((await runScoreAndPrioritize(manIntake, obsWithProfile)).scores.profile).not.toBeNull()
  })

  it('rejects a banned framing string ("low score")', async () => {
    mockedText.mockResolvedValue(scoresJson({ framing: 'low score' }))
    await expect(runScoreAndPrioritize(manIntake, baseObs)).rejects.toThrow(/VALIDATION_ERROR/)
  })

  it('rejects an out-of-range score', async () => {
    mockedText.mockResolvedValue(scoresJson({ score: 11 }))
    await expect(runScoreAndPrioritize(manIntake, baseObs)).rejects.toThrow(/VALIDATION_ERROR/)
  })

  it('rejects a priority list that is not exactly 3', async () => {
    mockedText.mockResolvedValue(
      JSON.stringify({
        scores: JSON.parse(scoresJson()).scores,
        top_3_priorities: [{ dimension: 'photos', reason: 'r', expected_impact: 'i' }],
      }),
    )
    await expect(runScoreAndPrioritize(manIntake, baseObs)).rejects.toThrow(/VALIDATION_ERROR/)
  })

  it('fails closed on non-JSON output', async () => {
    mockedText.mockResolvedValue('no json')
    await expect(runScoreAndPrioritize(manIntake, baseObs)).rejects.toThrow(/PARSE_ERROR/)
  })
})
