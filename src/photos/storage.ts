// Photo handling rules are non-negotiable (CLAUDE.md §2 rule 4, PRD §5.3):
// EXIF stripped on upload; 30-day TTL deletion; never used for training; never shared.
// Accepted: JPG/PNG/HEIC, ≤10MB/photo, ≤12 photos.

export interface StoredPhoto {
  /** Opaque storage key — safe to log; raw bytes are not. */
  key: string
  uploadedAt: string // ISO 8601
}

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024
export const MAX_PHOTOS = 12

/** Removes all EXIF/metadata from an image buffer before storage. */
export function stripExif(image: Uint8Array): Uint8Array {
  throw new Error('NOT_IMPLEMENTED: EXIF stripping')
}

/** Strips EXIF and stores the image in R2/S3 with a 30-day TTL. */
export async function storePhoto(image: Uint8Array, contentType: string): Promise<StoredPhoto> {
  throw new Error('NOT_IMPLEMENTED: photo storage (R2/S3, 30-day TTL)')
}

/** Immediate deletion — used for the under-18 hard gate (photos deleted at once). */
export async function deletePhoto(key: string): Promise<void> {
  throw new Error('NOT_IMPLEMENTED: photo deletion')
}
