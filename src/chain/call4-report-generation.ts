import type { IntakeJson, Observations, Scores } from '../types'

/**
 * Call 4 — Report Generation (model: MODELS.call4ReportGeneration).
 * Produces the full Markdown report, adapting to gender presentation and makeup
 * opt-in. Tone discipline matters most here. See docs/Prompt_Chain.md "Call 4".
 *
 * @param regenerationNotes appended on a REGENERATE verdict from Call 5 (max 2 retries).
 */
export async function runReportGeneration(
  intake: IntakeJson,
  observations: Observations,
  scores: Scores,
  regenerationNotes?: string,
): Promise<string> {
  throw new Error('NOT_IMPLEMENTED: Call 4 report generation')
}
