import type {
  IntakeJson,
  Observations,
  Scores,
  FilterResult,
  SafetyResult,
  SafetyClassification,
} from '../types'
import { isAgeEligible } from '../safety/age-gate'
import { routeSafetyClassification, type SafetyAction } from '../safety/routing'
import { containsBannedContent } from '../safety/banned-terms'
import { runSafetyPrecheck } from './call1-safety-precheck'
import { runPhotoAnalysis, type AnalysisImage } from './call2-photo-analysis'
import { runScoreAndPrioritize } from './call3-score-prioritize'
import { runReportGeneration } from './call4-report-generation'
import { runSafetyFilter } from './call5-safety-filter'

export interface GenerationInput {
  intake: IntakeJson
  /** Photos already fetched from storage (EXIF-stripped, vision-safe) by the caller. */
  images: AnalysisImage[]
}

export type GenerationOutcome =
  | { status: 'delivered'; reportMarkdown: string; filter: FilterResult }
  | { status: 'refused'; classification: SafetyClassification; action: SafetyAction }
  | { status: 'held'; classification: SafetyClassification; action: SafetyAction }
  | { status: 'hard_fail'; reasons: string[] }

/** Max Call 4 regenerations before HARD_FAIL (docs/Prompt_Chain.md Call 5 routing). */
export const MAX_REGENERATIONS = 2

function buildRegenerationNotes(filter: FilterResult): string {
  const parts: string[] = []
  if (filter.notesForRegeneration.trim().length > 0) parts.push(filter.notesForRegeneration.trim())
  if (filter.regenerateReasons.length > 0) parts.push(`Issues to fix: ${filter.regenerateReasons.join('; ')}`)
  return parts.length > 0
    ? parts.join('\n')
    : 'Improve warmth, specificity, agency, structure, and disclaimers per the guidelines.'
}

/**
 * Runs the full 5-call chain:
 *   age gate → Call 1 (safety pre-check) → route → Call 2 (analysis) → Call 3 (score)
 *   → Call 4 (report) ⇄ Call 5 (filter, max 2 regenerations) → deliver.
 *
 * Fails CLOSED throughout: a thrown Call 1 or Call 5, an exhausted regenerate loop, or a
 * deterministic banned-term hit all resolve to a non-delivery outcome — never a delivered
 * report (CLAUDE.md §2 rule 3). ED/MEDICAL/AGING flags are HELD (not served a standard
 * report) until the modified-report variants exist (FOLLOWUPS M5). See Prompt_Chain.md.
 */
export async function runChain(input: GenerationInput): Promise<GenerationOutcome> {
  const { intake, images } = input

  // Deterministic age gate — defense in depth even though intake should already gate it.
  if (!isAgeEligible(intake.age)) {
    return { status: 'refused', classification: 'FLAG_AGE', action: 'REFUSE_AGE' }
  }

  // Call 1 — fail closed: a thrown classification must NOT proceed to a report.
  let safety: SafetyResult
  try {
    safety = await runSafetyPrecheck(intake)
  } catch {
    return { status: 'hard_fail', reasons: ['Call 1 did not return a valid safety classification'] }
  }

  const action = routeSafetyClassification(safety.classification)
  switch (action) {
    case 'CONTINUE':
      break
    case 'REFUSE_AGE':
    case 'CRISIS_RESOURCES':
    case 'BDD_RESOURCES':
    case 'WEDDING_WAITLIST':
      return { status: 'refused', classification: safety.classification, action }
    case 'MODIFIED_ED':
    case 'MODIFIED_AGING':
    case 'MODIFIED_MEDICAL':
      // Modified-report variants are not built yet. Do NOT serve a standard report to a
      // flagged-vulnerable user (Trust_Safety §7.1) — hold for manual handling (M5).
      return { status: 'held', classification: safety.classification, action }
  }

  // --- Generation path (PASS / CONTINUE) ---

  let observations: Observations
  let scores: Scores
  try {
    observations = await runPhotoAnalysis(intake, images)
    scores = await runScoreAndPrioritize(intake, observations)
  } catch {
    return { status: 'hard_fail', reasons: ['Analysis or scoring did not return valid output'] }
  }

  let notes: string | undefined
  for (let attempt = 0; attempt <= MAX_REGENERATIONS; attempt++) {
    let report: string
    try {
      report = await runReportGeneration(intake, observations, scores, notes)
    } catch {
      return { status: 'hard_fail', reasons: ['Report generation failed'] }
    }

    // Deterministic backstop runs BEFORE the judge: a hard-banned term is an immediate
    // HARD_FAIL regardless of what Call 5 would say (CLAUDE.md §2 rule 6).
    const scan = containsBannedContent(report)
    if (scan.banned) {
      return { status: 'hard_fail', reasons: scan.matches.map((t) => `banned term (deterministic): ${t}`) }
    }

    let filter: FilterResult
    try {
      filter = await runSafetyFilter(report, intake)
    } catch {
      // Fail closed: an unparseable filter verdict must never be treated as PASS.
      return { status: 'hard_fail', reasons: ['Call 5 did not return a valid verdict'] }
    }

    if (filter.verdict === 'PASS') {
      return { status: 'delivered', reportMarkdown: report, filter }
    }
    if (filter.verdict === 'HARD_FAIL') {
      return { status: 'hard_fail', reasons: filter.hardFailReasons }
    }
    // REGENERATE — append notes and retry (until MAX_REGENERATIONS).
    notes = buildRegenerationNotes(filter)
  }

  return {
    status: 'hard_fail',
    reasons: ['Exceeded the maximum number of regenerations without passing the safety filter'],
  }
}
