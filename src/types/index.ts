// Core domain types for the GlowRank prompt chain.
// JSON shapes mirror docs/Prompt_Chain.md (Calls 1–5) and docs/PRD.md §3.2 / §4.

export type Gender = 'man' | 'woman' | 'non-binary' | 'prefer-not-to-say'

export type Goal = 'dating' | 'career' | 'specific-event' | 'new-chapter' | 'general-confidence'

export type BudgetTier = 'under-100' | '100-300' | '300-1000' | '1000-plus'

export type SkinUndertone = 'cool' | 'warm' | 'neutral' | 'not-sure'

/** Intake form payload (PRD §3.2). Conditional fields present only when applicable. */
export interface IntakeJson {
  age: number
  gender: Gender
  goal: Goal
  budgetTier: BudgetTier
  heightCm: number
  bodyType: string
  stylePreferences: string[]
  wardrobeVibe?: string
  makeupOptin: boolean
  skinUndertone?: SkinUndertone
  currentMakeupLevel?: string
  /** "Anything we should know?" — scanned for safety signals, never logged verbatim. */
  freeText?: string
  email: string
}

// --- Call 1: Safety Pre-Check ---

export type SafetyClassification =
  | 'PASS'
  | 'FLAG_BDD'
  | 'FLAG_CRISIS'
  | 'FLAG_ED'
  | 'FLAG_AGING'
  | 'FLAG_MEDICAL'
  | 'FLAG_AGE'
  | 'FLAG_WEDDING'

export interface SafetyResult {
  classification: SafetyClassification
  confidence: 'low' | 'medium' | 'high'
  reasoning: string
  signalsDetected: string[]
}

// --- Call 2: Photo & Intake Analysis ---

export interface DimensionObservation {
  observations: string[]
  strengths: string[]
  opportunities: string[]
}

export interface WardrobeObservation extends DimensionObservation {
  gaps: string[]
}

export interface MakeupObservation extends DimensionObservation {
  undertone: 'cool' | 'warm' | 'neutral' | 'unclear'
}

export interface Observations {
  grooming: DimensionObservation
  skin: DimensionObservation
  wardrobe: WardrobeObservation
  photos: DimensionObservation
  bodyLanguage: DimensionObservation
  profile: DimensionObservation | null
  makeup: MakeupObservation | null
  specificDetails: string[]
}

// --- Call 3: Score & Prioritization ---

export type Framing =
  | 'highest opportunity'
  | 'high opportunity'
  | 'moderate opportunity'
  | 'already strong'
  | 'already excellent'

export interface DimensionScore {
  score: number
  framing: Framing
}

export interface Priority {
  dimension: string
  reason: string
  expectedImpact: string
}

export interface Scores {
  scores: {
    grooming: DimensionScore
    skin: DimensionScore
    wardrobe: DimensionScore
    photos: DimensionScore
    bodyLanguage: DimensionScore
    profile: DimensionScore | null
    makeup: DimensionScore | null
  }
  topThreePriorities: [Priority, Priority, Priority]
}

// --- Call 5: Tone & Safety Filter ---

export type FilterVerdict = 'PASS' | 'REGENERATE' | 'HARD_FAIL'

export interface FilterResult {
  verdict: FilterVerdict
  hardFailReasons: string[]
  regenerateReasons: string[]
  toneScores: {
    warmth: number
    specificity: number
    agency: number
    motivation: number
  }
  structuralCheck: {
    allSectionsPresent: boolean
    disclaimersPresent: boolean
    makeupCorrectlyPresentOrAbsent: boolean
    wordCount: number
  }
  notesForRegeneration: string
}
