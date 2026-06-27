import type { IntakeJson, Gender, Goal, BudgetTier, SkinUndertone } from '../types'

// Pure intake validation — no I/O, no side effects (CLAUDE.md §6 Step 1).
// Validates shape and types only; the age gate (18+) is a separate hard check
// in the handler so it stays explicit and auditable.

const GENDERS: Gender[] = ['man', 'woman', 'non-binary', 'prefer-not-to-say']
const GOALS: Goal[] = ['dating', 'career', 'specific-event', 'new-chapter', 'general-confidence']
const BUDGET_TIERS: BudgetTier[] = ['under-100', '100-300', '300-1000', '1000-plus']
const SKIN_UNDERTONES: SkinUndertone[] = ['cool', 'warm', 'neutral', 'not-sure']

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function requireString(d: Record<string, unknown>, key: string): string {
  const v = d[key]
  if (typeof v !== 'string' || v.trim().length === 0) {
    throw new Error(`INVALID_INTAKE: ${key} must be a non-empty string`)
  }
  return v
}

function requireEnum<T extends string>(d: Record<string, unknown>, key: string, allowed: T[]): T {
  const v = d[key]
  if (!allowed.includes(v as T)) {
    throw new Error(`INVALID_INTAKE: ${key} must be one of ${allowed.join(', ')}`)
  }
  return v as T
}

/** Throws `INVALID_INTAKE: <reason>` for any field that fails validation. */
export function validateIntake(data: unknown): IntakeJson {
  if (!isRecord(data)) throw new Error('INVALID_INTAKE: expected an object')

  const age = data.age
  if (!Number.isInteger(age) || (age as number) < 1 || (age as number) > 120) {
    throw new Error('INVALID_INTAKE: age must be an integer between 1 and 120')
  }

  const gender = requireEnum(data, 'gender', GENDERS)
  const goal = requireEnum(data, 'goal', GOALS)
  const budgetTier = requireEnum(data, 'budgetTier', BUDGET_TIERS)

  const heightCm = data.heightCm
  if (!Number.isInteger(heightCm) || (heightCm as number) < 50 || (heightCm as number) > 300) {
    throw new Error('INVALID_INTAKE: heightCm must be an integer between 50 and 300')
  }

  const bodyType = requireString(data, 'bodyType')

  const stylePreferences = data.stylePreferences
  if (
    !Array.isArray(stylePreferences) ||
    stylePreferences.length === 0 ||
    !stylePreferences.every((s) => typeof s === 'string')
  ) {
    throw new Error('INVALID_INTAKE: stylePreferences must be a non-empty array of strings')
  }

  if (typeof data.makeupOptin !== 'boolean') {
    throw new Error('INVALID_INTAKE: makeupOptin must be a boolean')
  }

  const email = data.email
  if (typeof email !== 'string' || !email.includes('@') || email.trim().length === 0) {
    throw new Error('INVALID_INTAKE: email must be a valid email address')
  }

  // Optional fields
  const wardrobeVibe =
    data.wardrobeVibe !== undefined ? requireString(data, 'wardrobeVibe') : undefined
  const skinUndertone =
    data.skinUndertone !== undefined
      ? requireEnum(data, 'skinUndertone', SKIN_UNDERTONES)
      : undefined
  const currentMakeupLevel =
    data.currentMakeupLevel !== undefined ? requireString(data, 'currentMakeupLevel') : undefined
  // freeText: accept as-is (scanned for safety signals, never validated for content)
  const freeText =
    data.freeText !== undefined
      ? typeof data.freeText === 'string'
        ? data.freeText
        : undefined
      : undefined

  return {
    age: age as number,
    gender,
    goal,
    budgetTier,
    heightCm: heightCm as number,
    bodyType,
    stylePreferences: stylePreferences as string[],
    makeupOptin: data.makeupOptin,
    email: email.trim(),
    // Optional fields included only when present (exactOptionalPropertyTypes).
    ...(wardrobeVibe !== undefined ? { wardrobeVibe } : {}),
    ...(skinUndertone !== undefined ? { skinUndertone } : {}),
    ...(currentMakeupLevel !== undefined ? { currentMakeupLevel } : {}),
    ...(freeText !== undefined ? { freeText } : {}),
  }
}
