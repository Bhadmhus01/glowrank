import { describe, it, expect } from 'vitest'
import { validateIntake } from '../../src/intake/validate'

const VALID: Record<string, unknown> = {
  age: 28,
  gender: 'man',
  goal: 'dating',
  budgetTier: '100-300',
  heightCm: 178,
  bodyType: 'athletic',
  stylePreferences: ['casual', 'smart-casual'],
  makeupOptin: false,
  email: 'user@example.com',
}

describe('validateIntake', () => {
  it('accepts a valid minimal intake', () => {
    const result = validateIntake(VALID)
    expect(result.age).toBe(28)
    expect(result.gender).toBe('man')
    expect(result.email).toBe('user@example.com')
  })

  it('accepts optional fields when present', () => {
    const result = validateIntake({
      ...VALID,
      wardrobeVibe: 'streetwear',
      makeupOptin: true,
      skinUndertone: 'warm',
      currentMakeupLevel: 'beginner',
      freeText: 'Some notes here',
    })
    expect(result.wardrobeVibe).toBe('streetwear')
    expect(result.skinUndertone).toBe('warm')
    expect(result.freeText).toBe('Some notes here')
  })

  it('trims email whitespace', () => {
    const result = validateIntake({ ...VALID, email: '  user@example.com  ' })
    expect(result.email).toBe('user@example.com')
  })

  it('throws on non-object input', () => {
    expect(() => validateIntake('string')).toThrow('INVALID_INTAKE')
    expect(() => validateIntake(null)).toThrow('INVALID_INTAKE')
    expect(() => validateIntake(42)).toThrow('INVALID_INTAKE')
  })

  it('throws on non-integer age', () => {
    expect(() => validateIntake({ ...VALID, age: 28.5 })).toThrow('INVALID_INTAKE')
    expect(() => validateIntake({ ...VALID, age: 'twenty' })).toThrow('INVALID_INTAKE')
  })

  it('throws on out-of-range age', () => {
    expect(() => validateIntake({ ...VALID, age: 0 })).toThrow('INVALID_INTAKE')
    expect(() => validateIntake({ ...VALID, age: 121 })).toThrow('INVALID_INTAKE')
  })

  it('accepts age 17 (age gate enforces 18+ separately)', () => {
    // validateIntake does NOT enforce the age gate — that is the handler's explicit step
    expect(() => validateIntake({ ...VALID, age: 17 })).not.toThrow()
  })

  it('throws on invalid gender', () => {
    expect(() => validateIntake({ ...VALID, gender: 'alien' })).toThrow('INVALID_INTAKE')
  })

  it('throws on invalid goal', () => {
    expect(() => validateIntake({ ...VALID, goal: 'world-domination' })).toThrow('INVALID_INTAKE')
  })

  it('throws on invalid budgetTier', () => {
    expect(() => validateIntake({ ...VALID, budgetTier: 'broke' })).toThrow('INVALID_INTAKE')
  })

  it('throws on invalid heightCm', () => {
    expect(() => validateIntake({ ...VALID, heightCm: 49 })).toThrow('INVALID_INTAKE')
    expect(() => validateIntake({ ...VALID, heightCm: 301 })).toThrow('INVALID_INTAKE')
    expect(() => validateIntake({ ...VALID, heightCm: 175.5 })).toThrow('INVALID_INTAKE')
  })

  it('throws on empty stylePreferences', () => {
    expect(() => validateIntake({ ...VALID, stylePreferences: [] })).toThrow('INVALID_INTAKE')
  })

  it('throws on non-boolean makeupOptin', () => {
    expect(() => validateIntake({ ...VALID, makeupOptin: 'yes' })).toThrow('INVALID_INTAKE')
  })

  it('throws on invalid email (no @)', () => {
    expect(() => validateIntake({ ...VALID, email: 'notanemail' })).toThrow('INVALID_INTAKE')
  })

  it('throws on invalid skinUndertone when provided', () => {
    expect(() => validateIntake({ ...VALID, skinUndertone: 'olive' })).toThrow('INVALID_INTAKE')
  })
})
