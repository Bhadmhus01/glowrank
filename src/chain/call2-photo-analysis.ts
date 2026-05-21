import type {
  IntakeJson,
  Observations,
  DimensionObservation,
  WardrobeObservation,
  MakeupObservation,
} from '../types'
import { createVisionMessage, type VisionImageInput } from './anthropic'
import { MODELS } from './models'
import { CALL_2_SYSTEM_PROMPT, requirePrompt } from './prompts'

export type PhotoCategory =
  | 'face-front'
  | 'face-side'
  | 'full-body'
  | 'wardrobe'
  | 'dating-profile'
  | 'makeup-look'

/** A photo ready for analysis: already EXIF-stripped and in a vision-safe format. */
export interface AnalysisImage {
  category: PhotoCategory
  mediaType: 'image/jpeg' | 'image/png'
  bytes: Uint8Array
}

/** Builds the user message: structured intake fields + a legend of the attached photos. */
function buildUserText(intake: IntakeJson, images: AnalysisImage[]): string {
  const lines = [
    'INTAKE',
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
    if (intake.skinUndertone) lines.push(`- Skin undertone (self-reported): ${intake.skinUndertone}`)
    if (intake.currentMakeupLevel) lines.push(`- Current makeup level: ${intake.currentMakeupLevel}`)
  }
  lines.push('', 'PHOTOS (in the order attached above):')
  images.forEach((img, i) => lines.push(`- [${i + 1}] ${img.category}`))
  lines.push('', 'Analyze the attached photos and the intake. Return ONLY the JSON described in your instructions.')
  return lines.join('\n')
}

// --- output parsing (fails closed, mirrors Call 1's helper) ---

function extractJsonObject(text: string): string {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('CALL_2_PARSE_ERROR: no JSON object found in response')
  }
  return text.slice(start, end + 1)
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function asStringArray(v: unknown, field: string): string[] {
  if (!Array.isArray(v) || !v.every((x) => typeof x === 'string')) {
    throw new Error(`CALL_2_VALIDATION_ERROR: ${field} must be an array of strings`)
  }
  return v as string[]
}

function asDimension(v: unknown, name: string): DimensionObservation {
  if (!isObject(v)) throw new Error(`CALL_2_VALIDATION_ERROR: ${name} missing or not an object`)
  return {
    observations: asStringArray(v.observations, `${name}.observations`),
    strengths: asStringArray(v.strengths, `${name}.strengths`),
    opportunities: asStringArray(v.opportunities, `${name}.opportunities`),
  }
}

function asWardrobe(v: unknown): WardrobeObservation {
  const base = asDimension(v, 'wardrobe')
  return { ...base, gaps: asStringArray((v as Record<string, unknown>).gaps, 'wardrobe.gaps') }
}

const UNDERTONES = ['cool', 'warm', 'neutral', 'unclear'] as const

function asMakeup(v: unknown): MakeupObservation {
  const base = asDimension(v, 'makeup')
  const undertone = (v as Record<string, unknown>).undertone
  if (typeof undertone !== 'string' || !(UNDERTONES as readonly string[]).includes(undertone)) {
    throw new Error('CALL_2_VALIDATION_ERROR: makeup.undertone invalid')
  }
  return { ...base, undertone: undertone as MakeupObservation['undertone'] }
}

function parseObservations(
  raw: string,
  ctx: { makeupOptin: boolean; hasDatingScreenshots: boolean },
): Observations {
  let parsed: unknown
  try {
    parsed = JSON.parse(extractJsonObject(raw))
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('CALL_2_PARSE_ERROR')) throw err
    throw new Error('CALL_2_PARSE_ERROR: response was not valid JSON')
  }
  if (!isObject(parsed)) {
    throw new Error('CALL_2_VALIDATION_ERROR: response was not an object')
  }

  // Deterministic safety guards: a section is kept ONLY when it's permitted, regardless
  // of what the model returned (CLAUDE.md §2 rule 4 / Trust_Safety §2.6, §4.6).
  const profile =
    ctx.hasDatingScreenshots && isObject(parsed.profile) ? asDimension(parsed.profile, 'profile') : null
  const makeup = ctx.makeupOptin && isObject(parsed.makeup) ? asMakeup(parsed.makeup) : null

  return {
    grooming: asDimension(parsed.grooming, 'grooming'),
    skin: asDimension(parsed.skin, 'skin'),
    wardrobe: asWardrobe(parsed.wardrobe),
    photos: asDimension(parsed.photos, 'photos'),
    bodyLanguage: asDimension(parsed.body_language, 'body_language'),
    profile,
    makeup,
    specificDetails: asStringArray(parsed.specific_details, 'specific_details'),
  }
}

/**
 * Call 2 — Photo & Intake Analysis (model: MODELS.call2PhotoAnalysis, multimodal).
 * The only call that includes images. Produces neutral, structured observations
 * (internal data, never user-facing). See docs/Prompt_Chain.md "Call 2".
 */
export async function runPhotoAnalysis(
  intake: IntakeJson,
  images: AnalysisImage[],
): Promise<Observations> {
  const visionImages: VisionImageInput[] = images.map((img) => ({
    mediaType: img.mediaType,
    bytes: img.bytes,
  }))

  const raw = await createVisionMessage({
    model: MODELS.call2PhotoAnalysis,
    system: requirePrompt('CALL_2_SYSTEM_PROMPT', CALL_2_SYSTEM_PROMPT),
    userText: buildUserText(intake, images),
    images: visionImages,
    maxTokens: 3000,
    temperature: 0,
  })

  const hasDatingScreenshots = images.some((img) => img.category === 'dating-profile')
  return parseObservations(raw, { makeupOptin: intake.makeupOptin, hasDatingScreenshots })
}
