// Centralized environment configuration + launch-readiness reporting.
//
// Individual adapters still read `process.env` at their own seams; this module is the single
// source of truth for WHICH variables exist, WHICH are required to launch, and a NON-SECRET
// readiness view consumed by scripts/preflight.ts and api/health.ts. It never returns or logs
// secret VALUES — only presence booleans (CLAUDE.md §9).

/** Returns a required env var, or throws MISSING_ENV. Treats empty/whitespace as missing. */
export function requireEnv(name: string): string {
  const v = process.env[name]
  if (v === undefined || v.trim() === '') {
    throw new Error(`MISSING_ENV: ${name}`)
  }
  return v
}

/** Returns an env var or undefined (empty/whitespace normalized to undefined). */
export function optionalEnv(name: string): string | undefined {
  const v = process.env[name]
  return v === undefined || v.trim() === '' ? undefined : v
}

/** Whether an env var is present and non-empty. Never exposes the value. */
export function hasEnv(name: string): boolean {
  return optionalEnv(name) !== undefined
}

export interface EnvVarSpec {
  name: string
  required: boolean
  note?: string
}

export interface IntegrationSpec {
  key: string
  label: string
  /** Part of the core paid happy path — must be ready before a real launch. */
  launchCritical: boolean
  vars: EnvVarSpec[]
}

/**
 * Declarative map of every integration and its env vars (mirrors `.env.example`).
 * `required` = the integration cannot function without it; `launchCritical` = the launch
 * is blocked if this integration is not ready.
 */
export const INTEGRATIONS: IntegrationSpec[] = [
  {
    key: 'anthropic',
    label: 'Anthropic API (AI chain)',
    launchCritical: true,
    vars: [{ name: 'ANTHROPIC_API_KEY', required: true }],
  },
  {
    key: 'stripe',
    label: 'Stripe Checkout + webhooks',
    launchCritical: true,
    vars: [
      { name: 'STRIPE_SECRET_KEY', required: true },
      { name: 'STRIPE_WEBHOOK_SECRET', required: true },
      {
        name: 'STRIPE_PRICE_ID',
        required: false,
        note: 'optional; falls back to inline price_data',
      },
    ],
  },
  {
    key: 'photos',
    label: 'Photo storage (S3 / R2)',
    launchCritical: true,
    vars: [
      { name: 'PHOTO_BUCKET', required: true },
      { name: 'PHOTO_STORAGE_ACCESS_KEY_ID', required: true },
      { name: 'PHOTO_STORAGE_SECRET_ACCESS_KEY', required: true },
      {
        name: 'PHOTO_STORAGE_ENDPOINT',
        required: false,
        note: 'required for R2; omit for AWS S3 (+ AWS_REGION)',
      },
    ],
  },
  {
    key: 'email',
    label: 'Email (Resend)',
    launchCritical: true,
    vars: [
      { name: 'RESEND_API_KEY', required: true },
      {
        name: 'EMAIL_FROM',
        required: false,
        note: 'defaults to GlowRank <noreply@glowrank.co>; set a verified sender',
      },
    ],
  },
  {
    key: 'internal',
    label: 'Internal secrets',
    launchCritical: true,
    vars: [
      { name: 'GENERATE_SECRET', required: true, note: 'openssl rand -hex 32' },
      { name: 'CRON_SECRET', required: true, note: 'protects /api/cron/*' },
      { name: 'FLAGGED_EMAIL_SECRET', required: true, note: 'HMAC key; openssl rand -hex 32' },
    ],
  },
  {
    key: 'pdf',
    label: 'PDF rendering (PDFShift)',
    launchCritical: false,
    vars: [{ name: 'PDFSHIFT_API_KEY', required: false, note: 'PDF attachment is best-effort' }],
  },
  {
    key: 'analytics',
    label: 'Analytics (PostHog)',
    launchCritical: false,
    vars: [
      { name: 'POSTHOG_API_KEY', required: false, note: 'analytics no-op without it' },
      { name: 'POSTHOG_HOST', required: false, note: 'defaults to https://app.posthog.com' },
    ],
  },
]

export interface VarStatus extends EnvVarSpec {
  present: boolean
}

export interface IntegrationStatus {
  key: string
  label: string
  launchCritical: boolean
  /** True when every `required` var for this integration is present. */
  ready: boolean
  vars: VarStatus[]
}

export interface ReadinessReport {
  integrations: IntegrationStatus[]
  /** True when every launch-critical integration is ready. */
  launchReady: boolean
  /** Names of missing required vars belonging to launch-critical integrations. */
  missingRequired: string[]
}

/** Computes a non-secret readiness snapshot from the current environment. */
export function checkReadiness(): ReadinessReport {
  const integrations: IntegrationStatus[] = INTEGRATIONS.map((spec) => {
    const vars: VarStatus[] = spec.vars.map((v) => ({ ...v, present: hasEnv(v.name) }))
    const ready = vars.filter((v) => v.required).every((v) => v.present)
    return { key: spec.key, label: spec.label, launchCritical: spec.launchCritical, ready, vars }
  })

  const missingRequired = integrations
    .filter((i) => i.launchCritical)
    .flatMap((i) => i.vars.filter((v) => v.required && !v.present).map((v) => v.name))

  const launchReady = integrations.filter((i) => i.launchCritical).every((i) => i.ready)

  return { integrations, launchReady, missingRequired }
}
