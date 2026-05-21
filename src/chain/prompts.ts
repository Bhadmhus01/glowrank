// SOURCE OF TRUTH: docs/Prompt_Chain.md. Paste each system prompt VERBATIM.
// Do NOT paraphrase, shorten, or "improve" them — they are tone-audited (CLAUDE.md §2 rule 1, §8).
//
// These are intentionally empty in the skeleton. Fill each constant from the matching
// section of docs/Prompt_Chain.md as that call is implemented. `requirePrompt()` guards
// against shipping an unfilled prompt.

export const CALL_1_SYSTEM_PROMPT = '' // TODO: docs/Prompt_Chain.md → "Call 1 — Safety Pre-Check"
export const CALL_2_SYSTEM_PROMPT = '' // TODO: docs/Prompt_Chain.md → "Call 2 — Photo & Intake Analysis"
export const CALL_3_SYSTEM_PROMPT = '' // TODO: docs/Prompt_Chain.md → "Call 3 — Score & Prioritization"
export const CALL_4_SYSTEM_PROMPT = '' // TODO: docs/Prompt_Chain.md → "Call 4 — Report Generation"
export const CALL_5_SYSTEM_PROMPT = '' // TODO: docs/Prompt_Chain.md → "Call 5 — Tone & Safety Filter"

/** Throws if a prompt has not yet been pasted in from the doc. */
export function requirePrompt(name: string, value: string): string {
  if (value.trim().length === 0) {
    throw new Error(
      `PROMPT_NOT_LOADED: ${name} must be pasted verbatim from docs/Prompt_Chain.md`,
    )
  }
  return value
}
