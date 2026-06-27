import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IntakeJson } from '../../src/types'

vi.mock('../../src/chain/anthropic', () => ({
  createTextMessage: vi.fn(),
}))

import { createTextMessage } from '../../src/chain/anthropic'
import { runSafetyFilter } from '../../src/chain/call5-safety-filter'

const mockedText = vi.mocked(createTextMessage)

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
const womanIntake: IntakeJson = {
  ...manIntake,
  gender: 'woman',
  makeupOptin: true,
  email: 'maya@example.com',
}

function filterJson(over: Record<string, unknown> = {}) {
  return JSON.stringify({
    verdict: 'PASS',
    hard_fail_reasons: [],
    regenerate_reasons: [],
    tone_scores: { warmth: 8, specificity: 7, agency: 9, motivation: 8 },
    structural_check: {
      all_sections_present: true,
      disclaimers_present: true,
      makeup_correctly_present_or_absent: true,
      word_count: 2100,
    },
    notes_for_regeneration: '',
    ...over,
  })
}

beforeEach(() => {
  mockedText.mockReset()
})

describe('Call 5 — tone & safety filter', () => {
  it('parses a PASS result and maps snake_case keys to camelCase', async () => {
    mockedText.mockResolvedValue(filterJson())
    const r = await runSafetyFilter('# report', manIntake)
    expect(r.verdict).toBe('PASS')
    expect(r.toneScores.warmth).toBe(8)
    expect(r.structuralCheck.wordCount).toBe(2100)
    expect(r.hardFailReasons).toEqual([])
  })

  it('forces HARD_FAIL when hard_fail_reasons is non-empty, even if the model said PASS', async () => {
    mockedText.mockResolvedValue(
      filterJson({ verdict: 'PASS', hard_fail_reasons: ['banned term: ugly'] }),
    )
    expect((await runSafetyFilter('# report', manIntake)).verdict).toBe('HARD_FAIL')
  })

  it('forces REGENERATE when a tone score is below 7, even if the model said PASS', async () => {
    mockedText.mockResolvedValue(
      filterJson({ tone_scores: { warmth: 5, specificity: 7, agency: 9, motivation: 8 } }),
    )
    expect((await runSafetyFilter('# report', manIntake)).verdict).toBe('REGENERATE')
  })

  it('forces REGENERATE when a structural check fails, even if the model said PASS', async () => {
    mockedText.mockResolvedValue(
      filterJson({
        structural_check: {
          all_sections_present: true,
          disclaimers_present: false,
          makeup_correctly_present_or_absent: true,
          word_count: 2100,
        },
      }),
    )
    expect((await runSafetyFilter('# report', manIntake)).verdict).toBe('REGENERATE')
  })

  it('keeps HARD_FAIL as HARD_FAIL', async () => {
    mockedText.mockResolvedValue(
      filterJson({ verdict: 'HARD_FAIL', hard_fail_reasons: ['medical claim'] }),
    )
    expect((await runSafetyFilter('# report', manIntake)).verdict).toBe('HARD_FAIL')
  })

  it('returns PASS only when verdict is PASS and all evidence is clean', async () => {
    mockedText.mockResolvedValue(filterJson())
    expect((await runSafetyFilter('# report', manIntake)).verdict).toBe('PASS')
  })

  it('fails closed on an invalid verdict', async () => {
    mockedText.mockResolvedValue(filterJson({ verdict: 'MAYBE' }))
    await expect(runSafetyFilter('# report', manIntake)).rejects.toThrow(/VALIDATION_ERROR/)
  })

  it('fails closed on malformed tone_scores', async () => {
    mockedText.mockResolvedValue(filterJson({ tone_scores: { warmth: 8 } }))
    await expect(runSafetyFilter('# report', manIntake)).rejects.toThrow(/VALIDATION_ERROR/)
  })

  it('fails closed on non-JSON output (never silently passes)', async () => {
    mockedText.mockResolvedValue('looks fine to me')
    await expect(runSafetyFilter('# report', manIntake)).rejects.toThrow(/PARSE_ERROR/)
  })

  it('tells the auditor whether the makeup section must be present or absent', async () => {
    mockedText.mockResolvedValue(filterJson())
    await runSafetyFilter('# report', womanIntake)
    expect(mockedText.mock.calls[0]![0].userContent).toContain('makeup section MUST be present')

    mockedText.mockReset()
    mockedText.mockResolvedValue(filterJson())
    await runSafetyFilter('# report', manIntake)
    expect(mockedText.mock.calls[0]![0].userContent).toContain('makeup section MUST be absent')
  })
})
