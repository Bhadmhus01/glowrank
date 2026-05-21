import type { IntakeJson, SafetyClassification } from '../types'

export interface GenerationInput {
  intake: IntakeJson
  /** Storage keys for uploaded photos (never raw bytes). */
  photoKeys: string[]
}

export type GenerationOutcome =
  | { status: 'delivered'; reportMarkdown: string }
  | { status: 'refused'; classification: SafetyClassification }
  | { status: 'hard_fail'; reasons: string[] }

/**
 * Runs the full 5-call chain:
 *   Call 1 (safety pre-check) → route → Call 2 (analysis) → Call 3 (score)
 *   → Call 4 (report) ⇄ Call 5 (filter, max 2 regenerations) → deliver.
 * See docs/Prompt_Chain.md "Prompt Chain Architecture".
 */
export async function runChain(input: GenerationInput): Promise<GenerationOutcome> {
  throw new Error('NOT_IMPLEMENTED: chain orchestrator')
}

/** Max Call 4 regenerations before HARD_FAIL (docs/Prompt_Chain.md Call 5 routing). */
export const MAX_REGENERATIONS = 2
