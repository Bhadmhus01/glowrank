// Per-call model assignments — CLAUDE.md §5. Do NOT change without human approval;
// these are product decisions, not cost optimizations.
//
// Use the latest production alias for each tier — do not pin a dated version unless
// instructed (CLAUDE.md §5). Confirm the exact current alias strings against the
// Anthropic model list before go-live.
export const MODELS = {
  /** Call 1 — Safety Pre-Check: text-only, fast, cheap. */
  call1SafetyPrecheck: 'claude-haiku-4-5-20251001',
  /** Call 2 — Photo Analysis: multimodal vision required. */
  call2PhotoAnalysis: 'claude-sonnet-4-6',
  /** Call 3 — Score & Prioritize: reasoning-heavy. */
  call3ScorePrioritize: 'claude-sonnet-4-6',
  /** Call 4 — Report Generation: tone discipline matters most. */
  call4ReportGeneration: 'claude-opus-4-7',
  /** Call 5 — Safety Filter: independent of Call 4's model. */
  call5SafetyFilter: 'claude-sonnet-4-6',
} as const

export type ModelKey = keyof typeof MODELS
