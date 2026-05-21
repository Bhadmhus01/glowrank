import type { IntakeJson, Observations, Scores } from '../types'

/**
 * Call 3 — Score & Prioritization (model: MODELS.call3ScorePrioritize).
 * Converts observations into the 6- or 7-dimension OPPORTUNITY scorecard and a
 * top-3 priority list ranked by leverage — NOT raw score. See docs/Prompt_Chain.md "Call 3".
 */
export async function runScoreAndPrioritize(
  intake: IntakeJson,
  observations: Observations,
): Promise<Scores> {
  throw new Error('NOT_IMPLEMENTED: Call 3 score & prioritize')
}
