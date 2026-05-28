/**
 * Dev harness — runs the REAL 5-call chain against a local intake + photos and prints each
 * call's status, then the outcome. Mirrors src/chain/orchestrator.ts (the canonical flow)
 * but verbose, so a model-alias / API problem surfaces clearly instead of being folded into
 * a generic hard_fail.
 *
 *   ANTHROPIC_API_KEY=sk-... npm run report -- ./report-input.json
 *
 * Makes REAL API calls (costs money). No calls happen at import time — only when run.
 * Not part of the product flow or the test suite; a manual diagnostic tool.
 */
import { readFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import type { IntakeJson } from '../src/types'
import type { GenerationOutcome } from '../src/chain/orchestrator'
import { MAX_REGENERATIONS } from '../src/chain/orchestrator'
import { isAgeEligible } from '../src/safety/age-gate'
import { routeSafetyClassification } from '../src/safety/routing'
import { containsBannedContent } from '../src/safety/banned-terms'
import { planFulfillment } from '../src/fulfillment/plan'
import { runSafetyPrecheck } from '../src/chain/call1-safety-precheck'
import { runPhotoAnalysis, type AnalysisImage, type PhotoCategory } from '../src/chain/call2-photo-analysis'
import { runScoreAndPrioritize } from '../src/chain/call3-score-prioritize'
import { runReportGeneration } from '../src/chain/call4-report-generation'
import { runSafetyFilter } from '../src/chain/call5-safety-filter'

interface InputFile {
  intake: IntakeJson
  photos: { category: PhotoCategory; path: string }[]
}

const MEDIA_TYPES: Record<string, 'image/jpeg' | 'image/png'> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
}

function die(message: string): never {
  console.error(`\n✗ ${message}\n`)
  process.exit(1)
}

async function astep<T>(label: string, fn: () => Promise<T>): Promise<T> {
  process.stdout.write(`▶ ${label} ... `)
  try {
    const result = await fn()
    console.log('✓')
    return result
  } catch (err) {
    console.log('✗')
    die(`${label} failed:\n   ${(err as Error).message}`)
  }
}

function loadImages(photos: InputFile['photos']): AnalysisImage[] {
  return photos.map((p) => {
    const mediaType = MEDIA_TYPES[extname(p.path).toLowerCase()]
    if (!mediaType) {
      die(`Unsupported image "${p.path}". Use JPG or PNG — HEIC→JPEG conversion is M4 (not built).`)
    }
    try {
      return { category: p.category, mediaType, bytes: new Uint8Array(readFileSync(resolve(p.path))) }
    } catch {
      return die(`Could not read photo: ${p.path}`)
    }
  })
}

async function runPipeline(intake: IntakeJson, images: AnalysisImage[]): Promise<GenerationOutcome> {
  if (!isAgeEligible(intake.age)) {
    console.log(`▶ Age gate ... ✗ (age ${intake.age} < 18)`)
    return { status: 'refused', classification: 'FLAG_AGE', action: 'REFUSE_AGE' }
  }
  console.log(`▶ Age gate ... ✓ (age ${intake.age})`)

  const safety = await astep('Call 1 — safety pre-check (Haiku)', () => runSafetyPrecheck(intake))
  console.log(`   → ${safety.classification} (${safety.confidence})`)
  const action = routeSafetyClassification(safety.classification)
  console.log(`   → route: ${action}`)
  if (action !== 'CONTINUE') {
    const status = action.startsWith('MODIFIED') ? 'held' : 'refused'
    return { status, classification: safety.classification, action } as GenerationOutcome
  }

  const observations = await astep('Call 2 — photo & intake analysis (Sonnet, vision)', () =>
    runPhotoAnalysis(intake, images),
  )
  console.log(
    `   → ${observations.specificDetails.length} specific detail(s); makeup=${observations.makeup ? 'yes' : 'no'}, profile=${observations.profile ? 'yes' : 'no'}`,
  )

  const scores = await astep('Call 3 — score & prioritize (Sonnet)', () =>
    runScoreAndPrioritize(intake, observations),
  )
  console.log(`   → top 3: ${scores.topThreePriorities.map((p) => p.dimension).join(', ')}`)

  let notes: string | undefined
  for (let attempt = 0; attempt <= MAX_REGENERATIONS; attempt++) {
    const label = `Call 4 — report generation (Opus)${attempt > 0 ? ` [retry ${attempt}]` : ''}`
    const report = await astep(label, () => runReportGeneration(intake, observations, scores, notes))

    const scan = containsBannedContent(report)
    if (scan.banned) {
      console.log(`   ✗ deterministic banned-term backstop: ${scan.matches.join(', ')}`)
      return { status: 'hard_fail', reasons: scan.matches.map((t) => `banned term (deterministic): ${t}`) }
    }

    const filter = await astep('Call 5 — tone & safety filter (Sonnet)', () => runSafetyFilter(report, intake))
    console.log(
      `   → verdict=${filter.verdict}; tone=${JSON.stringify(filter.toneScores)}; words=${filter.structuralCheck.wordCount}`,
    )

    if (filter.verdict === 'PASS') return { status: 'delivered', reportMarkdown: report, filter }
    if (filter.verdict === 'HARD_FAIL') return { status: 'hard_fail', reasons: filter.hardFailReasons }

    notes = [filter.notesForRegeneration, ...filter.regenerateReasons]
      .filter((s) => s.trim().length > 0)
      .join('\n')
    console.log(`   ↻ REGENERATE: ${filter.regenerateReasons.join('; ') || '(see notes)'}`)
  }

  return { status: 'hard_fail', reasons: ['Exceeded max regenerations without passing the filter'] }
}

function printOutcome(outcome: GenerationOutcome): void {
  console.log(`\n=== Outcome: ${outcome.status.toUpperCase()} ===`)
  if (outcome.status === 'delivered') {
    console.log('\n----------------- REPORT (Markdown) -----------------\n')
    console.log(outcome.reportMarkdown)
    console.log('\n-----------------------------------------------------')
  } else if (outcome.status === 'refused' || outcome.status === 'held') {
    console.log(`classification=${outcome.classification}, action=${outcome.action}`)
  } else {
    console.log(`reasons: ${outcome.reasons.join('; ')}`)
  }
  console.log(`\nFulfillment plan:\n${JSON.stringify(planFulfillment(outcome), null, 2)}`)
}

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    die('ANTHROPIC_API_KEY is not set. Run:  export ANTHROPIC_API_KEY=sk-...  first.')
  }
  const inputPath = process.argv[2]
  if (inputPath === undefined) {
    die('Usage: npm run report -- <input.json>   (copy report-input.example.json and edit it)')
  }

  let input: InputFile
  try {
    input = JSON.parse(readFileSync(resolve(inputPath), 'utf8')) as InputFile
  } catch (err) {
    die(`Could not read/parse ${inputPath}: ${(err as Error).message}`)
  }

  const images = loadImages(input.photos ?? [])
  console.log('\n=== GlowRank report harness — REAL API calls (this costs money) ===')
  console.log(
    `Intake: gender=${input.intake.gender}, goal=${input.intake.goal}, budget=${input.intake.budgetTier}, makeup=${input.intake.makeupOptin}`,
  )
  console.log(`Photos: ${images.map((i) => i.category).join(', ') || '(none — Call 2 needs the 3 required photos)'}\n`)

  printOutcome(await runPipeline(input.intake, images))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
