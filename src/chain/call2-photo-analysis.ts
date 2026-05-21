import type { IntakeJson, Observations } from '../types'

/**
 * Call 2 — Photo & Intake Analysis (model: MODELS.call2PhotoAnalysis, multimodal).
 * The only call that includes images. Produces neutral, structured observations
 * (internal data, never user-facing). See docs/Prompt_Chain.md "Call 2".
 *
 * @param photoKeys storage keys for the user's uploaded photos (never raw bytes in logs).
 */
export async function runPhotoAnalysis(
  intake: IntakeJson,
  photoKeys: string[],
): Promise<Observations> {
  throw new Error('NOT_IMPLEMENTED: Call 2 photo & intake analysis')
}
