import type { IntakeJson, FilterResult } from '../types'

/**
 * Call 5 — Tone & Safety Filter (model: MODELS.call5SafetyFilter).
 * Audits a generated report for banned content, tone, makeup-specific issues, and
 * required elements. The most attackable surface in the product — never weaken or
 * add a bypass (CLAUDE.md §2 rule 3, §8). See docs/Prompt_Chain.md "Call 5".
 *
 * @param reportMarkdown the draft from Call 4.
 * @param intake used to verify makeup section is present IFF the user opted in.
 */
export async function runSafetyFilter(
  reportMarkdown: string,
  intake: IntakeJson,
): Promise<FilterResult> {
  throw new Error('NOT_IMPLEMENTED: Call 5 tone & safety filter')
}
