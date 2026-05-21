import type { IntakeJson, SafetyResult } from '../types'

/**
 * Call 1 — Safety Pre-Check (model: MODELS.call1SafetyPrecheck).
 * Text-only scan of intake free-text + fields for vulnerability signals
 * BEFORE any photo/cost is spent. See docs/Prompt_Chain.md "Call 1".
 */
export async function runSafetyPrecheck(intake: IntakeJson): Promise<SafetyResult> {
  throw new Error('NOT_IMPLEMENTED: Call 1 safety pre-check')
}
