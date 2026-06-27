import type { IntakeJson, FilterResult, FilterVerdict } from '../types'
import { createTextMessage } from './anthropic'
import { MODELS } from './models'
import { CALL_5_SYSTEM_PROMPT, requirePrompt } from './prompts'

const VERDICTS: readonly FilterVerdict[] = ['PASS', 'REGENERATE', 'HARD_FAIL']
const TONE_THRESHOLD = 7

function buildUserText(reportMarkdown: string, intake: IntakeJson): string {
  return [
    intake.makeupOptin
      ? 'Makeup module: opted in — the makeup section MUST be present.'
      : 'Makeup module: not opted in — the makeup section MUST be absent.',
    `Expected word-count band: ${intake.makeupOptin ? '2000–2800' : '1500–2300'}.`,
    '',
    'REPORT DRAFT TO AUDIT:',
    reportMarkdown,
    '',
    'Audit the report and return ONLY the JSON described in your instructions.',
  ].join('\n')
}

// --- output parsing (fails closed) ---

function extractJsonObject(text: string): string {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('CALL_5_PARSE_ERROR: no JSON object found in response')
  }
  return text.slice(start, end + 1)
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function asNumber(v: unknown, field: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(`CALL_5_VALIDATION_ERROR: ${field} must be a finite number`)
  }
  return v
}

function asBool(v: unknown, field: string): boolean {
  if (typeof v !== 'boolean') throw new Error(`CALL_5_VALIDATION_ERROR: ${field} must be a boolean`)
  return v
}

/** Absent → []; present-but-malformed → throw (fail closed; don't silently drop signal). */
function asReasons(v: unknown, field: string): string[] {
  if (v === undefined) return []
  if (!Array.isArray(v) || !v.every((x) => typeof x === 'string')) {
    throw new Error(`CALL_5_VALIDATION_ERROR: ${field} must be an array of strings`)
  }
  return v as string[]
}

function parseFilterResult(raw: string): FilterResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(extractJsonObject(raw))
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('CALL_5_PARSE_ERROR')) throw err
    throw new Error('CALL_5_PARSE_ERROR: response was not valid JSON', { cause: err })
  }
  if (!isObject(parsed)) throw new Error('CALL_5_VALIDATION_ERROR: response was not an object')

  const modelVerdict = parsed.verdict
  if (typeof modelVerdict !== 'string' || !(VERDICTS as readonly string[]).includes(modelVerdict)) {
    throw new Error('CALL_5_VALIDATION_ERROR: invalid verdict')
  }

  const ts = parsed.tone_scores
  if (!isObject(ts)) throw new Error('CALL_5_VALIDATION_ERROR: missing tone_scores')
  const toneScores = {
    warmth: asNumber(ts.warmth, 'tone_scores.warmth'),
    specificity: asNumber(ts.specificity, 'tone_scores.specificity'),
    agency: asNumber(ts.agency, 'tone_scores.agency'),
    motivation: asNumber(ts.motivation, 'tone_scores.motivation'),
  }

  const sc = parsed.structural_check
  if (!isObject(sc)) throw new Error('CALL_5_VALIDATION_ERROR: missing structural_check')
  const structuralCheck = {
    allSectionsPresent: asBool(sc.all_sections_present, 'structural_check.all_sections_present'),
    disclaimersPresent: asBool(sc.disclaimers_present, 'structural_check.disclaimers_present'),
    makeupCorrectlyPresentOrAbsent: asBool(
      sc.makeup_correctly_present_or_absent,
      'structural_check.makeup_correctly_present_or_absent',
    ),
    wordCount: asNumber(sc.word_count, 'structural_check.word_count'),
  }

  const hardFailReasons = asReasons(parsed.hard_fail_reasons, 'hard_fail_reasons')
  const regenerateReasons = asReasons(parsed.regenerate_reasons, 'regenerate_reasons')
  const notesForRegeneration =
    parsed.notes_for_regeneration === undefined ? '' : String(parsed.notes_for_regeneration)

  // Reconcile to the STRICTEST verdict — never looser than the evidence (CLAUDE.md §2 rule 3).
  const anyToneBelowThreshold =
    toneScores.warmth < TONE_THRESHOLD ||
    toneScores.specificity < TONE_THRESHOLD ||
    toneScores.agency < TONE_THRESHOLD ||
    toneScores.motivation < TONE_THRESHOLD
  const structuralIssue =
    !structuralCheck.allSectionsPresent ||
    !structuralCheck.disclaimersPresent ||
    !structuralCheck.makeupCorrectlyPresentOrAbsent

  let verdict: FilterVerdict
  if (modelVerdict === 'HARD_FAIL' || hardFailReasons.length > 0) {
    verdict = 'HARD_FAIL'
  } else if (
    modelVerdict === 'REGENERATE' ||
    regenerateReasons.length > 0 ||
    anyToneBelowThreshold ||
    structuralIssue
  ) {
    verdict = 'REGENERATE'
  } else {
    verdict = 'PASS'
  }

  return {
    verdict,
    hardFailReasons,
    regenerateReasons,
    toneScores,
    structuralCheck,
    notesForRegeneration,
  }
}

/**
 * Call 5 — Tone & Safety Filter (model: MODELS.call5SafetyFilter, independent of Call 4).
 * Audits a draft report and returns a verdict. Fails CLOSED: an unparseable/invalid filter
 * response throws and must be treated as do-not-deliver (HARD_FAIL) by the orchestrator —
 * never as PASS. The returned verdict is the strictest of the model's verdict and the
 * evidence. See docs/Prompt_Chain.md "Call 5". Never weaken this (CLAUDE.md §2 rule 3).
 */
export async function runSafetyFilter(
  reportMarkdown: string,
  intake: IntakeJson,
): Promise<FilterResult> {
  const raw = await createTextMessage({
    model: MODELS.call5SafetyFilter,
    system: requirePrompt('CALL_5_SYSTEM_PROMPT', CALL_5_SYSTEM_PROMPT),
    userContent: buildUserText(reportMarkdown, intake),
    maxTokens: 1000,
    temperature: 0,
  })
  return parseFilterResult(raw)
}
