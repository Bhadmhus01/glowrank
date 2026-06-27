import type { IntakeJson, Observations, Scores } from '../types'
import { createTextMessage } from './anthropic'
import { MODELS } from './models'
import { CALL_4_SYSTEM_PROMPT, requirePrompt } from './prompts'

/** Sections that should appear in the report, given intake + which observations are active. */
function activeSections(intake: IntakeJson, observations: Observations): string[] {
  const sections = ['grooming', 'skin', 'wardrobe', 'photos', 'body language']
  if (observations.profile !== null) sections.push('profile')
  if (intake.makeupOptin && observations.makeup !== null) sections.push('makeup')
  return sections
}

function buildUserText(
  intake: IntakeJson,
  observations: Observations,
  scores: Scores,
  regenerationNotes?: string,
): string {
  const lines = [
    'USER CONTEXT',
    `- Gender presentation: ${intake.gender}`,
    `- Primary goal: ${intake.goal}`,
    `- Budget tier: ${intake.budgetTier}`,
    `- Height (cm): ${intake.heightCm}`,
    `- Body type (self-reported): ${intake.bodyType}`,
    `- Style preferences: ${intake.stylePreferences.join(', ') || '(none)'}`,
  ]
  if (intake.wardrobeVibe) lines.push(`- Wardrobe vibe: ${intake.wardrobeVibe}`)
  lines.push(`- Makeup opt-in: ${intake.makeupOptin}`)
  if (intake.makeupOptin) {
    if (intake.skinUndertone) lines.push(`- Skin undertone: ${intake.skinUndertone}`)
    if (intake.currentMakeupLevel)
      lines.push(`- Current makeup level: ${intake.currentMakeupLevel}`)
  }
  lines.push(`- Active sections to include: ${activeSections(intake, observations).join(', ')}`)

  lines.push('', 'OBSERVATIONS:', JSON.stringify(observations, null, 2))
  lines.push('', 'SCORES & TOP 3 PRIORITIES:', JSON.stringify(scores, null, 2))

  if (regenerationNotes !== undefined && regenerationNotes.trim().length > 0) {
    lines.push(
      '',
      'REVISION REQUIRED — address these specific issues from the safety/quality review:',
      regenerationNotes,
    )
  }

  lines.push(
    '',
    'Write the full report in Markdown, following your instructions exactly. Output ONLY the report.',
  )
  return lines.join('\n')
}

/**
 * Call 4 — Report Generation (model: MODELS.call4ReportGeneration).
 * Produces the full Markdown report, adapting to gender presentation and makeup opt-in.
 * Returns raw text — it is NOT validated here; Call 5 (the safety/tone filter) is the
 * gate, and `regenerationNotes` carries Call 5's feedback on a REGENERATE verdict
 * (max 2 retries, enforced by the orchestrator). See docs/Prompt_Chain.md "Call 4".
 */
export async function runReportGeneration(
  intake: IntakeJson,
  observations: Observations,
  scores: Scores,
  regenerationNotes?: string,
): Promise<string> {
  const report = await createTextMessage({
    model: MODELS.call4ReportGeneration,
    system: requirePrompt('CALL_4_SYSTEM_PROMPT', CALL_4_SYSTEM_PROMPT),
    userContent: buildUserText(intake, observations, scores, regenerationNotes),
    maxTokens: 5000,
    temperature: 0.7,
  })
  return report.trim()
}
