import { describe, it, expect, vi, beforeEach } from 'vitest'
import type {
  IntakeJson,
  Observations,
  Scores,
  FilterResult,
  SafetyResult,
  SafetyClassification,
  Framing,
} from '../../src/types'
import type { AnalysisImage } from '../../src/chain/call2-photo-analysis'

// Mock only the AI calls. Routing, the age gate, and the banned-terms scan run for real.
vi.mock('../../src/chain/call1-safety-precheck', () => ({ runSafetyPrecheck: vi.fn() }))
vi.mock('../../src/chain/call2-photo-analysis', () => ({ runPhotoAnalysis: vi.fn() }))
vi.mock('../../src/chain/call3-score-prioritize', () => ({ runScoreAndPrioritize: vi.fn() }))
vi.mock('../../src/chain/call4-report-generation', () => ({ runReportGeneration: vi.fn() }))
vi.mock('../../src/chain/call5-safety-filter', () => ({ runSafetyFilter: vi.fn() }))

import { runChain, MAX_REGENERATIONS } from '../../src/chain/orchestrator'
import { runSafetyPrecheck } from '../../src/chain/call1-safety-precheck'
import { runPhotoAnalysis } from '../../src/chain/call2-photo-analysis'
import { runScoreAndPrioritize } from '../../src/chain/call3-score-prioritize'
import { runReportGeneration } from '../../src/chain/call4-report-generation'
import { runSafetyFilter } from '../../src/chain/call5-safety-filter'

const call1 = vi.mocked(runSafetyPrecheck)
const call2 = vi.mocked(runPhotoAnalysis)
const call3 = vi.mocked(runScoreAndPrioritize)
const call4 = vi.mocked(runReportGeneration)
const call5 = vi.mocked(runSafetyFilter)

const intake: IntakeJson = {
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
const images: AnalysisImage[] = [
  { category: 'face-front', mediaType: 'image/jpeg', bytes: new Uint8Array([1]) },
]

const dim = { observations: ['o'], strengths: ['s'], opportunities: ['p'] }
const observations: Observations = {
  grooming: dim,
  skin: dim,
  wardrobe: { ...dim, gaps: [] },
  photos: dim,
  bodyLanguage: dim,
  profile: null,
  makeup: null,
  specificDetails: ['a', 'b', 'c'],
}
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

function safety(classification: SafetyClassification): SafetyResult {
  return { classification, confidence: 'high', reasoning: 'r', signalsDetected: [] }
}
function filter(verdict: FilterResult['verdict'], over: Partial<FilterResult> = {}): FilterResult {
  return {
    verdict,
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
    ...over,
  }
}

const CLEAN_REPORT = '# Your GlowRank Report\n\nWarm, specific, and kind.'

beforeEach(() => {
  vi.clearAllMocks()
  call2.mockResolvedValue(observations)
  call3.mockResolvedValue(scores)
  call4.mockResolvedValue(CLEAN_REPORT)
})

describe('orchestrator — runChain', () => {
  it('caps regenerations at 2', () => {
    expect(MAX_REGENERATIONS).toBe(2)
  })

  it('delivers on the happy path (PASS → analysis → score → report → filter PASS)', async () => {
    call1.mockResolvedValue(safety('PASS'))
    call5.mockResolvedValue(filter('PASS'))
    const outcome = await runChain({ intake, images })
    expect(outcome.status).toBe('delivered')
    if (outcome.status === 'delivered') expect(outcome.reportMarkdown).toBe(CLEAN_REPORT)
  })

  it('refuses under-18 at the deterministic age gate before calling anything', async () => {
    const outcome = await runChain({ intake: { ...intake, age: 16 }, images })
    expect(outcome).toMatchObject({ status: 'refused', action: 'REFUSE_AGE' })
    expect(call1).not.toHaveBeenCalled()
  })

  it('refuses (no report) on a CRISIS flag', async () => {
    call1.mockResolvedValue(safety('FLAG_CRISIS'))
    const outcome = await runChain({ intake, images })
    expect(outcome).toMatchObject({ status: 'refused', action: 'CRISIS_RESOURCES' })
    expect(call2).not.toHaveBeenCalled()
  })

  it('HOLDS an ED-flagged user (never serves a standard report)', async () => {
    call1.mockResolvedValue(safety('FLAG_ED'))
    const outcome = await runChain({ intake, images })
    expect(outcome).toMatchObject({ status: 'held', action: 'MODIFIED_ED' })
    expect(call4).not.toHaveBeenCalled()
  })

  it('regenerates on REGENERATE then delivers, passing notes to Call 4 the second time', async () => {
    call1.mockResolvedValue(safety('PASS'))
    call5
      .mockResolvedValueOnce(filter('REGENERATE', { regenerateReasons: ['tone too flat'] }))
      .mockResolvedValueOnce(filter('PASS'))
    const outcome = await runChain({ intake, images })
    expect(outcome.status).toBe('delivered')
    expect(call4).toHaveBeenCalledTimes(2)
    expect(call4.mock.calls[1][3]).toContain('tone too flat') // regenerationNotes arg
  })

  it('hard-fails on a Call 5 HARD_FAIL verdict', async () => {
    call1.mockResolvedValue(safety('PASS'))
    call5.mockResolvedValue(filter('HARD_FAIL', { hardFailReasons: ['banned term'] }))
    const outcome = await runChain({ intake, images })
    expect(outcome).toMatchObject({ status: 'hard_fail' })
  })

  it('hard-fails after exhausting regenerations (3 Call 4 attempts)', async () => {
    call1.mockResolvedValue(safety('PASS'))
    call5.mockResolvedValue(filter('REGENERATE', { regenerateReasons: ['still flat'] }))
    const outcome = await runChain({ intake, images })
    expect(outcome.status).toBe('hard_fail')
    expect(call4).toHaveBeenCalledTimes(3) // initial + 2 retries
  })

  it('fails closed when Call 1 throws (does not proceed to a report)', async () => {
    call1.mockRejectedValue(new Error('CALL_1_PARSE_ERROR'))
    const outcome = await runChain({ intake, images })
    expect(outcome.status).toBe('hard_fail')
    expect(call2).not.toHaveBeenCalled()
  })

  it('fails closed when Call 5 throws (never treated as PASS)', async () => {
    call1.mockResolvedValue(safety('PASS'))
    call5.mockRejectedValue(new Error('CALL_5_PARSE_ERROR'))
    const outcome = await runChain({ intake, images })
    expect(outcome.status).toBe('hard_fail')
  })

  it('hard-fails via the deterministic backstop even if the judge would PASS', async () => {
    call1.mockResolvedValue(safety('PASS'))
    call4.mockResolvedValue('# Report\n\nHonestly you look ugly here.')
    call5.mockResolvedValue(filter('PASS')) // judge would have passed it
    const outcome = await runChain({ intake, images })
    expect(outcome.status).toBe('hard_fail')
    if (outcome.status === 'hard_fail') {
      expect(outcome.reasons.join(' ')).toContain('ugly')
    }
    expect(call5).not.toHaveBeenCalled() // scan runs before the judge
  })
})
