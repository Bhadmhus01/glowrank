/**
 * Hard age gate (CLAUDE.md §2 rule 5, PRD §7.1). Users under 18 are refused at
 * intake; payment never processes; their photos are deleted immediately. This is a
 * hard gate, not a soft warning — and it is non-bypassable.
 */
export const MINIMUM_AGE = 18

/** Returns true only if the user is verifiably 18 or older. */
export function isAgeEligible(age: number): boolean {
  throw new Error('NOT_IMPLEMENTED: age gate')
}
