import { describe, it, expect } from 'vitest'
import {
  validatePhoto,
  isAllowedContentType,
  validatePhotoCount,
  MAX_PHOTO_BYTES,
} from '../../src/photos/validation'

describe('photo content-type validation', () => {
  it('accepts jpeg, png, and heic', () => {
    expect(isAllowedContentType('image/jpeg')).toBe(true)
    expect(isAllowedContentType('image/png')).toBe(true)
    expect(isAllowedContentType('image/heic')).toBe(true)
    expect(isAllowedContentType('image/heif')).toBe(true)
  })

  it('accepts the non-standard image/jpg alias and ignores casing/params', () => {
    expect(isAllowedContentType('image/jpg')).toBe(true)
    expect(isAllowedContentType('IMAGE/JPEG; charset=binary')).toBe(true)
  })

  it('rejects unsupported formats', () => {
    expect(isAllowedContentType('image/gif')).toBe(false)
    expect(isAllowedContentType('image/webp')).toBe(false)
    expect(isAllowedContentType('application/pdf')).toBe(false)
  })
})

describe('photo validation', () => {
  it('flags empty uploads', () => {
    expect(validatePhoto(new Uint8Array(0), 'image/jpeg')).toBe('EMPTY')
  })

  it('flags oversize uploads (>10MB)', () => {
    expect(validatePhoto(new Uint8Array(MAX_PHOTO_BYTES + 1), 'image/jpeg')).toBe('TOO_LARGE')
  })

  it('flags unsupported formats', () => {
    expect(validatePhoto(new Uint8Array([1, 2, 3]), 'image/gif')).toBe('UNSUPPORTED_FORMAT')
  })

  it('accepts a valid photo', () => {
    expect(validatePhoto(new Uint8Array([1, 2, 3]), 'image/jpeg')).toBeNull()
  })
})

describe('photo count validation', () => {
  it('allows 1..12 photos', () => {
    expect(validatePhotoCount(1)).toBe(true)
    expect(validatePhotoCount(12)).toBe(true)
  })

  it('rejects 0, >12, and non-integers', () => {
    expect(validatePhotoCount(0)).toBe(false)
    expect(validatePhotoCount(13)).toBe(false)
    expect(validatePhotoCount(2.5)).toBe(false)
  })
})
