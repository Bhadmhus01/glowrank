import { describe, it, expect, afterEach } from 'vitest'
import { requireEnv, optionalEnv, hasEnv, checkReadiness, INTEGRATIONS } from '../../src/config/env'

const ORIGINAL = { ...process.env }
afterEach(() => {
  process.env = { ...ORIGINAL }
})

/** Sets every launch-critical required var so the environment is "launch-ready". */
function setLaunchCriticalVars(): void {
  for (const integration of INTEGRATIONS) {
    if (!integration.launchCritical) continue
    for (const v of integration.vars) {
      if (v.required) process.env[v.name] = 'x'
    }
  }
}

describe('requireEnv / optionalEnv / hasEnv', () => {
  it('requireEnv returns the value when set', () => {
    process.env.SOME_KEY = 'value'
    expect(requireEnv('SOME_KEY')).toBe('value')
  })

  it('requireEnv throws MISSING_ENV when unset or blank', () => {
    delete process.env.SOME_KEY
    expect(() => requireEnv('SOME_KEY')).toThrow('MISSING_ENV: SOME_KEY')
    process.env.SOME_KEY = '   '
    expect(() => requireEnv('SOME_KEY')).toThrow('MISSING_ENV')
  })

  it('optionalEnv normalizes empty/whitespace to undefined', () => {
    process.env.SOME_KEY = ''
    expect(optionalEnv('SOME_KEY')).toBeUndefined()
    process.env.SOME_KEY = '  '
    expect(optionalEnv('SOME_KEY')).toBeUndefined()
    process.env.SOME_KEY = 'real'
    expect(optionalEnv('SOME_KEY')).toBe('real')
  })

  it('hasEnv reflects presence without exposing the value', () => {
    delete process.env.SOME_KEY
    expect(hasEnv('SOME_KEY')).toBe(false)
    process.env.SOME_KEY = 'secret'
    expect(hasEnv('SOME_KEY')).toBe(true)
  })
})

describe('checkReadiness', () => {
  it('is launchReady with no missing required vars when all launch-critical vars are set', () => {
    setLaunchCriticalVars()
    const report = checkReadiness()
    expect(report.launchReady).toBe(true)
    expect(report.missingRequired).toEqual([])
  })

  it('is not launchReady and lists the specific missing required var', () => {
    setLaunchCriticalVars()
    delete process.env.ANTHROPIC_API_KEY
    const report = checkReadiness()
    expect(report.launchReady).toBe(false)
    expect(report.missingRequired).toContain('ANTHROPIC_API_KEY')
    const anthropic = report.integrations.find((i) => i.key === 'anthropic')
    expect(anthropic?.ready).toBe(false)
  })

  it('optional integrations never block launch readiness', () => {
    setLaunchCriticalVars()
    delete process.env.PDFSHIFT_API_KEY
    delete process.env.POSTHOG_API_KEY
    const report = checkReadiness()
    expect(report.launchReady).toBe(true)
    const pdf = report.integrations.find((i) => i.key === 'pdf')
    expect(pdf?.launchCritical).toBe(false)
  })

  it('never exposes secret values — only presence booleans', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-super-secret'
    const serialized = JSON.stringify(checkReadiness())
    expect(serialized).not.toContain('sk-super-secret')
    expect(serialized).toContain('"present":true')
  })
})
