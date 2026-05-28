/**
 * Hard age gate (CLAUDE.md §2 rule 5, PRD §7.1). Users under 18 are refused at
 * intake; payment never processes; their photos are deleted immediately. This is a
 * hard gate, not a soft warning — and it is non-bypassable.
 */
export const MINIMUM_AGE = 18

/**
 * Returns true only if the user is verifiably 18 or older. Deterministic — this gate
 * runs on the intake `age` field BEFORE payment, independent of any model output.
 * Call 1's FLAG_AGE is a separate backstop for under-18 signals in free-text.
 * Rejects non-integers, NaN, and negative/zero ages.
 */
export function isAgeEligible(age: number): boolean {
  return Number.isInteger(age) && age >= MINIMUM_AGE
}
