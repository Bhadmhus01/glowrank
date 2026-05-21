// Banned content is BANNED, not "minimized" (CLAUDE.md §2 rule 6).
// SOURCE OF TRUTH: docs/Trust_Safety.md §3 + docs/Prompt_Chain.md "Call 5".
// Fill these lists VERBATIM from those docs before the filter is implemented — do not
// invent, abbreviate, or editorialize the terms.

export const BANNED_TERMS_UNIVERSAL: readonly string[] = [] // TODO: Trust_Safety §3 / Call 5 (1)
export const BANNED_TERMS_MENS: readonly string[] = [] //      TODO: Trust_Safety §3 / Call 5 (2)
export const BANNED_TERMS_WOMENS: readonly string[] = [] //    TODO: Trust_Safety §3 / Call 5 (3)
export const BANNED_TERMS_AGING: readonly string[] = [] //     TODO: Trust_Safety §3 / Call 5 (4)
export const BANNED_PHRASES_MAKEUP_AS_CORRECTION: readonly string[] = [] // TODO: Call 5 (5)

export interface BannedScanResult {
  banned: boolean
  matches: string[]
}

/**
 * Deterministic pre-filter for hard-banned terms. This runs IN ADDITION to Call 5's
 * model-based audit — it is a backstop, never a replacement, and must never be loosened
 * to make a test pass (CLAUDE.md §2 rule 3).
 */
export function containsBannedContent(text: string): BannedScanResult {
  throw new Error('NOT_IMPLEMENTED: banned content scan')
}
