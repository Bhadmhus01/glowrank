import type { IntakeJson, SafetyResult, SafetyClassification } from '../types'
import { createTextMessage } from './anthropic'
import { MODELS } from './models'
import { CALL_1_SYSTEM_PROMPT, requirePrompt } from './prompts'

const CLASSIFICATIONS: readonly SafetyClassification[] = [
  'PASS',
  'FLAG_BDD',
  'FLAG_CRISIS',
  'FLAG_ED',
  'FLAG_AGING',
  'FLAG_MEDICAL',
  'FLAG_AGE',
  'FLAG_WEDDING',
]

const CONFIDENCES = ['low', 'medium', 'high'] as const
type Confidence = (typeof CONFIDENCES)[number]

/** Returns only the domain portion of an email — never the full address (CLAUDE.md §9). */
function emailDomain(email: string): string {
  const at = email.lastIndexOf('@')
  return at >= 0 ? email.slice(at + 1) : 'unknown'
}

/**
 * Builds the Call 1 user message from exactly the inputs the doc specifies: age, gender
 * presentation, goal, free-text, and email domain. The free-text is sent to the model
 * but is never logged verbatim (CLAUDE.md §9).
 */
function buildUserMessage(intake: IntakeJson): string {
  return [
    `Age: ${intake.age}`,
    `Gender presentation: ${intake.gender}`,
    `Primary goal: ${intake.goal}`,
    `Email domain: ${emailDomain(intake.email)}`,
    `Anything we should know (free-text): ${intake.freeText ?? '(none provided)'}`,
  ].join('\n')
}

/** Extracts the JSON object from a response that may contain surrounding prose or fences. */
function extractJsonObject(text: string): string {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('CALL_1_PARSE_ERROR: no JSON object found in response')
  }
  return text.slice(start, end + 1)
}

/**
 * Parses and validates the classifier output. Fails CLOSED: an unparseable or invalid
 * response throws — it is never silently treated as PASS. The caller (orchestrator) must
 * route a thrown Call 1 to a non-delivery / manual-review path.
 */
function parseSafetyResult(raw: string): SafetyResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(extractJsonObject(raw))
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('CALL_1_PARSE_ERROR')) throw err
    throw new Error('CALL_1_PARSE_ERROR: response was not valid JSON', { cause: err })
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('CALL_1_VALIDATION_ERROR: response was not an object')
  }
  const obj = parsed as Record<string, unknown>

  const { classification, confidence, reasoning } = obj
  if (
    typeof classification !== 'string' ||
    !CLASSIFICATIONS.includes(classification as SafetyClassification)
  ) {
    throw new Error('CALL_1_VALIDATION_ERROR: invalid classification')
  }
  if (typeof confidence !== 'string' || !CONFIDENCES.includes(confidence as Confidence)) {
    throw new Error('CALL_1_VALIDATION_ERROR: invalid confidence')
  }
  if (typeof reasoning !== 'string') {
    throw new Error('CALL_1_VALIDATION_ERROR: invalid reasoning')
  }

  const rawSignals = obj.signals_detected
  const signalsDetected =
    Array.isArray(rawSignals) && rawSignals.every((s) => typeof s === 'string')
      ? (rawSignals as string[])
      : []

  return {
    classification: classification as SafetyClassification,
    confidence: confidence as Confidence,
    reasoning,
    signalsDetected,
  }
}

/**
 * Call 1 — Safety Pre-Check (model: MODELS.call1SafetyPrecheck).
 * Text-only scan of intake free-text + fields for vulnerability signals BEFORE any
 * photo/cost is spent. See docs/Prompt_Chain.md "Call 1".
 */
export async function runSafetyPrecheck(intake: IntakeJson): Promise<SafetyResult> {
  const raw = await createTextMessage({
    model: MODELS.call1SafetyPrecheck,
    system: requirePrompt('CALL_1_SYSTEM_PROMPT', CALL_1_SYSTEM_PROMPT),
    userContent: buildUserMessage(intake),
    maxTokens: 512,
    temperature: 0,
  })
  return parseSafetyResult(raw)
}
