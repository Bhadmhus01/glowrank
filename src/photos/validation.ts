// Photo upload validation (PRD §5.3). Pure — no I/O, no dependencies.
// Accepted: JPG/PNG/HEIC, ≤10MB/photo, ≤12 photos.

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024 // 10 MB
export const MAX_PHOTOS = 12

export const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
] as const

export type PhotoValidationError = 'EMPTY' | 'TOO_LARGE' | 'UNSUPPORTED_FORMAT'

/** Lowercases and strips any parameters (e.g. "; charset=...") from a content type. */
function normalize(contentType: string): string {
  return contentType.toLowerCase().split(';')[0].trim()
}

export function isAllowedContentType(contentType: string): boolean {
  const n = normalize(contentType)
  // 'image/jpg' is a common non-standard alias for 'image/jpeg'.
  return (ALLOWED_CONTENT_TYPES as readonly string[]).includes(n) || n === 'image/jpg'
}

/** Returns the first validation failure, or null if the photo is acceptable. */
export function validatePhoto(bytes: Uint8Array, contentType: string): PhotoValidationError | null {
  if (bytes.length === 0) return 'EMPTY'
  if (bytes.length > MAX_PHOTO_BYTES) return 'TOO_LARGE'
  if (!isAllowedContentType(contentType)) return 'UNSUPPORTED_FORMAT'
  return null
}

/** True if the number of uploaded photos is within the allowed range (1..12). */
export function validatePhotoCount(count: number): boolean {
  return Number.isInteger(count) && count >= 1 && count <= MAX_PHOTOS
}
