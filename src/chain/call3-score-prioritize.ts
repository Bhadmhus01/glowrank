import type {
  IntakeJson,
  Observations,
  Scores,
  DimensionScore,
  Priority,
  Framing,
} from '../types'
import { createTextMessage } from './anthropic'
import { MODELS } from './models'
import { CALL_3_SYSTEM_PROMPT, requirePrompt } from './prompts'

/** Builds the user message: stated goal/budget/gender + the Call 2 observations. */
function buildUserText(intake: IntakeJson, observations: Observations): string {
  return [
    'USER CONTEXT',
    `- Gender presentation: ${intake.gender}`,
    `- Primary goal: ${intake.goal}`,
    `- Budget tier: ${intake.budgetTier}`,
    `- Makeup opt-in: ${intake.makeupOptin}`,
    '',
    'OBSERVATIONS (from photo & intake analysis):',
    JSON.stringify(observations, null, 2),
    '',
    'Score each active dimension and return ONLY the JSON described in your instructions.',
  ].join('\n')
}

// --- output parsing (fails closed) ---

function extractJsonObject(text: string): string {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('CALL_3_PARSE_ERROR: no JSON object found in response')
  }
  return text.slice(start, end + 1)
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

const FRAMINGS: readonly Framing[] = [
  'highest opportunity',
  'high opportunity',
  'moderate opportunity',
  'already strong',
  'already excellent',
]

function asScore(v: unknown, name: string): DimensionScore {
  if (!isObject(v)) throw new Error(`CALL_3_VALIDATION_ERROR: ${name} missing or not an object`)
  const { score, framing } = v
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 1 || score > 10) {
    throw new Error(`CALL_3_VALIDATION_ERROR: ${name}.score must be a number in 1..10`)
  }
  if (typeof framing !== 'string' || !(FRAMINGS as readonly string[]).includes(framing)) {
    throw new Error(`CALL_3_VALIDATION_ERROR: ${name}.framing not an allowed framing string`)
  }
  return { score, framing: framing as Framing }
}

function asPriority(v: unknown, idx: number): Priority {
  if (!isObject(v)) throw new Error(`CALL_3_VALIDATION_ERROR: priority[${idx}] not an object`)
  const { dimension, reason } = v
  const expectedImpact = v.expected_impact
  if (typeof dimension !== 'string' || typeof reason !== 'string' || typeof expectedImpact !== 'string') {
    throw new Error(`CALL_3_VALIDATION_ERROR: priority[${idx}] missing dimension/reason/expected_impact`)
  }
  return { dimension, reason, expectedImpact }
}

function parseScores(
  raw: string,
  ctx: { keepMakeup: boolean; keepProfile: boolean },
): Scores {
  let parsed: unknown
  try {
    parsed = JSON.parse(extractJsonObject(raw))
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('CALL_3_PARSE_ERROR')) throw err
    throw new Error('CALL_3_PARSE_ERROR: response was not valid JSON')
  }
  if (!isObject(parsed) || !isObject(parsed.scores)) {
    throw new Error('CALL_3_VALIDATION_ERROR: missing scores object')
  }
  const s = parsed.scores

  // Conditional dimensions are kept only when active in the observations (mirrors Call 2).
  const profile = ctx.keepProfile && isObject(s.profile) ? asScore(s.profile, 'profile') : null
  const makeup = ctx.keepMakeup && isObject(s.makeup) ? asScore(s.makeup, 'makeup') : null

  const prioritiesRaw = parsed.top_3_priorities
  if (!Array.isArray(prioritiesRaw) || prioritiesRaw.length !== 3) {
    throw new Error('CALL_3_VALIDATION_ERROR: top_3_priorities must have exactly 3 entries')
  }

  return {
    scores: {
      grooming: asScore(s.grooming, 'grooming'),
      skin: asScore(s.skin, 'skin'),
      wardrobe: asScore(s.wardrobe, 'wardrobe'),
      photos: asScore(s.photos, 'photos'),
      bodyLanguage: asScore(s.body_language, 'body_language'),
      profile,
      makeup,
    },
    topThreePriorities: [
      asPriority(prioritiesRaw[0], 0),
      asPriority(prioritiesRaw[1], 1),
      asPriority(prioritiesRaw[2], 2),
    ],
  }
}

/**
 * Call 3 — Score & Prioritization (model: MODELS.call3ScorePrioritize).
 * Converts observations into the 6- or 7-dimension OPPORTUNITY scorecard and a top-3
 * priority list ranked by leverage — NOT raw score. See docs/Prompt_Chain.md "Call 3".
 */
export async function runScoreAndPrioritize(
  intake: IntakeJson,
  observations: Observations,
): Promise<Scores> {
  const raw = await createTextMessage({
    model: MODELS.call3ScorePrioritize,
    system: requirePrompt('CALL_3_SYSTEM_PROMPT', CALL_3_SYSTEM_PROMPT),
    userContent: buildUserText(intake, observations),
    maxTokens: 1500,
    temperature: 0,
  })

  return parseScores(raw, {
    keepMakeup: intake.makeupOptin && observations.makeup !== null,
    keepProfile: observations.profile !== null,
  })
}
