import { describe, it, expect } from 'vitest'
import { runChain, MAX_REGENERATIONS } from '../../src/chain/orchestrator'
import type { IntakeJson } from '../../src/types'

// End-to-end chain wiring. RED until the orchestrator is implemented.
// NOTE: when implemented, the AI calls MUST be mocked here — never hit the real API
// in tests (CLAUDE.md §6 Step 5).

const sampleIntake: IntakeJson = {
  age: 26,
  gender: 'man',
  goal: 'dating',
  budgetTier: '100-300',
  heightCm: 178,
  bodyType: 'average',
  stylePreferences: ['smart-casual'],
  makeupOptin: false,
  email: 'test@example.com',
}

describe('chain orchestrator', () => {
  it('caps Call 4 regenerations at 2', () => {
    expect(MAX_REGENERATIONS).toBe(2)
  })

  it('produces a generation outcome for a passing intake (mocked AI)', async () => {
    const outcome = await runChain({ intake: sampleIntake, photoKeys: ['front', 'side', 'body'] })
    expect(outcome.status).toBeDefined()
  })
})
