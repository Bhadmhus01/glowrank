import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IntakeJson } from '../../src/types'

// Mock the Anthropic wrapper — tests NEVER hit the real API (CLAUDE.md §6 Step 5).
vi.mock('../../src/chain/anthropic', () => ({
  createTextMessage: vi.fn(),
}))

import { createTextMessage } from '../../src/chain/anthropic'
import { runSafetyPrecheck } from '../../src/chain/call1-safety-precheck'

const mockedCreate = vi.mocked(createTextMessage)

const baseIntake: IntakeJson = {
  age: 26,
  gender: 'man',
  goal: 'dating',
  budgetTier: '100-300',
  heightCm: 178,
  bodyType: 'average',
  stylePreferences: ['smart-casual'],
  makeupOptin: false,
  email: 'daniel@example.com',
}

beforeEach(() => {
  mockedCreate.mockReset()
})

describe('Call 1 — safety pre-check', () => {
  it('returns a PASS classification', async () => {
    mockedCreate.mockResolvedValue(
      JSON.stringify({
        classification: 'PASS',
        confidence: 'high',
        reasoning: 'No vulnerability signals.',
        signals_detected: [],
      }),
    )
    const result = await runSafetyPrecheck(baseIntake)
    expect(result.classification).toBe('PASS')
    expect(result.signalsDetected).toEqual([])
  })

  it('maps snake_case signals_detected to camelCase signalsDetected', async () => {
    mockedCreate.mockResolvedValue(
      JSON.stringify({
        classification: 'FLAG_BDD',
        confidence: 'medium',
        reasoning: 'Repeated self-directed appearance language.',
        signals_detected: ['self-directed extreme appearance language'],
      }),
    )
    const result = await runSafetyPrecheck(baseIntake)
    expect(result.classification).toBe('FLAG_BDD')
    expect(result.signalsDetected).toEqual(['self-directed extreme appearance language'])
  })

  it('tolerates JSON wrapped in prose / code fences', async () => {
    mockedCreate.mockResolvedValue(
      'Here is the classification:\n```json\n' +
        JSON.stringify({
          classification: 'FLAG_CRISIS',
          confidence: 'high',
          reasoning: 'Self-harm reference.',
          signals_detected: ['self-harm reference'],
        }) +
        '\n```',
    )
    const result = await runSafetyPrecheck(baseIntake)
    expect(result.classification).toBe('FLAG_CRISIS')
  })

  it('fails closed: throws on an invalid classification rather than defaulting to PASS', async () => {
    mockedCreate.mockResolvedValue(
      JSON.stringify({
        classification: 'NONSENSE',
        confidence: 'high',
        reasoning: 'x',
        signals_detected: [],
      }),
    )
    await expect(runSafetyPrecheck(baseIntake)).rejects.toThrow(/VALIDATION_ERROR/)
  })

  it('fails closed: throws on non-JSON output (never silently passes)', async () => {
    mockedCreate.mockResolvedValue('I cannot help with that request.')
    await expect(runSafetyPrecheck(baseIntake)).rejects.toThrow(/PARSE_ERROR/)
  })

  it('sends only the email domain, never the full address', async () => {
    mockedCreate.mockResolvedValue(
      JSON.stringify({
        classification: 'PASS',
        confidence: 'high',
        reasoning: 'r',
        signals_detected: [],
      }),
    )
    await runSafetyPrecheck(baseIntake)
    const params = mockedCreate.mock.calls[0]![0]
    expect(params.userContent).toContain('example.com')
    expect(params.userContent).not.toContain('daniel@example.com')
  })

  it('uses the Haiku model assignment for Call 1', async () => {
    mockedCreate.mockResolvedValue(
      JSON.stringify({
        classification: 'PASS',
        confidence: 'low',
        reasoning: 'r',
        signals_detected: [],
      }),
    )
    await runSafetyPrecheck(baseIntake)
    expect(mockedCreate.mock.calls[0]![0].model).toMatch(/haiku/)
  })
})
