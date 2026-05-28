// Deterministic banned-content backstop (CLAUDE.md §2 rule 6).
//
// IMPORTANT: every banned term from docs/Trust_Safety.md §3.1 + Prompt_Chain.md Call 5 is
// enforced by the Call 5 AI judge (the full list lives in CALL_5_SYSTEM_PROMPT). This module
// is an ADDITIONAL, guaranteed catch — it does NOT replace or narrow that enforcement.
//
// It deliberately contains only CONTEXT-INDEPENDENT terms (banned in any context). Terms
// whose ban depends on context are intentionally left to the judge, because a literal scan
// would wrongly flag legitimate copy:
//   "skinny" (banned body word) vs "skinny jeans" (valid wardrobe rec)
//   "fat" vs "buccal fat" (itself banned) / "fatty acids" (skincare)
//   "mid"/"mid-tier" vs "midi skirt" / "midtone"
//   "alpha"/"beta" vs "beta version" / "alpha channel"
//   "snatched", "hooded eyes", "double chin", "age spots", "asymmetrical", "plain", "short",
//   and the "hide/slim/cover up/correct your [feature]" templates — all judged in context.
// Never loosen this without updating the judge accordingly (CLAUDE.md §2 rule 3).

export const BANNED_TERMS_UNIVERSAL: readonly string[] = [
  'ugly',
  'unattractive',
  'hideous',
  'deformed',
  'scrawny',
  'lanky',
  'frumpy',
  'dowdy',
  'balding',
  'weak features',
  'harsh features',
  'bad bone structure',
  'out of shape',
  'basic-looking',
]

export const BANNED_TERMS_MENS: readonly string[] = [
  'canthal tilt',
  'mewing',
  'bone smash',
  'hunter eyes',
  'mogged',
  'maxilla',
  'looksmax',
]

export const BANNED_TERMS_WOMENS: readonly string[] = ['buccal fat', 'butterface']

export const BANNED_TERMS_AGING: readonly string[] = [
  'anti-aging',
  'younger-looking',
  'erase wrinkles',
  'reverse aging',
  'fight aging',
  'turkey neck',
]

export const BANNED_PHRASES_MAKEUP_AS_CORRECTION: readonly string[] = ['contour to fix']

const ALL_DETERMINISTIC_TERMS: readonly string[] = [
  ...BANNED_TERMS_UNIVERSAL,
  ...BANNED_TERMS_MENS,
  ...BANNED_TERMS_WOMENS,
  ...BANNED_TERMS_AGING,
  ...BANNED_PHRASES_MAKEUP_AS_CORRECTION,
]

/**
 * Compiles a term to a case-insensitive, whole-word regex. Multi-token terms allow any run
 * of whitespace/hyphens between tokens, so "bone smash" also matches "bone-smash" and
 * "anti-aging" also matches "anti aging".
 */
function compile(term: string): RegExp {
  const pattern = term
    .trim()
    .split(/[\s-]+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[\\s-]+')
  return new RegExp(`\\b${pattern}\\b`, 'i')
}

const COMPILED: { term: string; re: RegExp }[] = ALL_DETERMINISTIC_TERMS.map((term) => ({
  term,
  re: compile(term),
}))

export interface BannedScanResult {
  banned: boolean
  matches: string[]
}

/**
 * Deterministic pre-filter for hard-banned, context-independent terms. Runs IN ADDITION to
 * Call 5's model audit — a backstop, never a replacement (CLAUDE.md §2 rule 3). Returns the
 * canonical banned terms found (deduplicated).
 */
export function containsBannedContent(text: string): BannedScanResult {
  const matches = COMPILED.filter(({ re }) => re.test(text)).map(({ term }) => term)
  return { banned: matches.length > 0, matches }
}
