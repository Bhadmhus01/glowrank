import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IntakeJson } from '../../src/types'

vi.mock('../../src/chain/anthropic', () => ({
  createVisionMessage: vi.fn(),
}))

import { createVisionMessage } from '../../src/chain/anthropic'
import { runPhotoAnalysis } from '../../src/chain/call2-photo-analysis'
import type { AnalysisImage } from '../../src/chain/call2-photo-analysis'

const mockedVision = vi.mocked(createVisionMessage)

const womanIntake: IntakeJson = {
  age: 36,
  gender: 'woman',
  goal: 'new-chapter',
  budgetTier: '300-1000',
  heightCm: 170,
  bodyType: 'average',
  stylePreferences: ['classic'],
  makeupOptin: true,
  skinUndertone: 'warm',
  currentMakeupLevel: 'daily-light',
  email: 'maya@example.com',
}

const manIntake: IntakeJson = {
  age: 26,
  gender: 'man',
  goal: 'dating',
  budgetTier: '100-300',
  heightCm: 178,
  bodyType: 'athletic',
  stylePreferences: ['smart-casual'],
  makeupOptin: false,
  email: 'daniel@example.com',
}

const baseImages: AnalysisImage[] = [
  { category: 'face-front', mediaType: 'image/jpeg', bytes: new Uint8Array([1]) },
  { category: 'face-side', mediaType: 'image/jpeg', bytes: new Uint8Array([2]) },
  { category: 'full-body', mediaType: 'image/jpeg', bytes: new Uint8Array([3]) },
]

function observationsJson(opts: { withProfile?: boolean; withMakeup?: boolean } = {}) {
  const dim = { observations: ['o'], strengths: ['s'], opportunities: ['p'] }
  const obj: Record<string, unknown> = {
    grooming: dim,
    skin: dim,
    wardrobe: { ...dim, gaps: ['blazer'] },
    photos: dim,
    body_language: dim,
    profile: opts.withProfile ? dim : null,
    makeup: opts.withMakeup ? { ...dim, undertone: 'warm' } : null,
    specific_details: ['d1', 'd2', 'd3'],
  }
  return JSON.stringify(obj)
}

beforeEach(() => {
  mockedVision.mockReset()
})

describe('Call 2 — photo & intake analysis', () => {
  it('parses observations and maps snake_case keys to camelCase', async () => {
    mockedVision.mockResolvedValue(observationsJson({ withMakeup: true }))
    const result = await runPhotoAnalysis(womanIntake, baseImages)
    expect(result.grooming.strengths).toEqual(['s'])
    expect(result.wardrobe.gaps).toEqual(['blazer'])
    expect(result.bodyLanguage.observations).toEqual(['o']) // body_language -> bodyLanguage
    expect(result.specificDetails).toHaveLength(3)
    expect(result.makeup?.undertone).toBe('warm')
  })

  it('drops the makeup section when the user did NOT opt in, even if the model returns one', async () => {
    mockedVision.mockResolvedValue(observationsJson({ withMakeup: true }))
    const result = await runPhotoAnalysis(manIntake, baseImages)
    expect(result.makeup).toBeNull()
  })

  it('drops the profile section when no dating screenshots were provided', async () => {
    mockedVision.mockResolvedValue(observationsJson({ withProfile: true }))
    const result = await runPhotoAnalysis(manIntake, baseImages) // no dating-profile image
    expect(result.profile).toBeNull()
  })

  it('keeps the profile section when dating screenshots are provided', async () => {
    mockedVision.mockResolvedValue(observationsJson({ withProfile: true }))
    const withProfile: AnalysisImage[] = [
      ...baseImages,
      { category: 'dating-profile', mediaType: 'image/jpeg', bytes: new Uint8Array([4]) },
    ]
    const result = await runPhotoAnalysis(manIntake, withProfile)
    expect(result.profile).not.toBeNull()
  })

  it('sends one image block per photo to the Sonnet vision model', async () => {
    mockedVision.mockResolvedValue(observationsJson())
    await runPhotoAnalysis(manIntake, baseImages)
    const params = mockedVision.mock.calls[0]![0]
    expect(params.images).toHaveLength(3)
    expect(params.model).toMatch(/sonnet/)
  })

  it('fails closed on malformed output (a required dimension missing)', async () => {
    mockedVision.mockResolvedValue(
      JSON.stringify({ grooming: { observations: [], strengths: [], opportunities: [] } }),
    )
    await expect(runPhotoAnalysis(manIntake, baseImages)).rejects.toThrow(/VALIDATION_ERROR/)
  })

  it('fails closed on non-JSON output', async () => {
    mockedVision.mockResolvedValue('no json here')
    await expect(runPhotoAnalysis(manIntake, baseImages)).rejects.toThrow(/PARSE_ERROR/)
  })
})
