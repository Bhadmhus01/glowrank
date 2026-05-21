import { randomUUID } from 'node:crypto'
import { validatePhoto } from './validation'

// Photo handling rules are non-negotiable (CLAUDE.md §2 rule 4, PRD §5.3):
// EXIF stripped on upload; 30-day TTL deletion; never used for training; never shared.
//
// The actual R2/S3 client and the EXIF-stripping/HEIC-conversion image processor are
// injected as dependencies so this module stays pure and fully testable. Their concrete
// adapters (@aws-sdk/client-s3, sharp) are deferred — see FOLLOWUPS.md (M4).

export interface StoredPhoto {
  /** Opaque storage key — safe to log; raw bytes are not. */
  key: string
  uploadedAt: string // ISO 8601
}

/** A stored object as returned by a listing — used by the deletion sweep. */
export interface StorageObject {
  key: string
  uploadedAt: Date
}

export interface PutObjectParams {
  key: string
  bytes: Uint8Array
  contentType: string
  uploadedAt: Date
}

/** Storage seam. Implemented by an S3-compatible adapter that targets either R2 or S3. */
export interface StorageClient {
  put(params: PutObjectParams): Promise<void>
  delete(key: string): Promise<void>
  /** Lists stored objects with their upload time (e.g. from object metadata / LastModified). */
  list(): Promise<StorageObject[]>
}

/** A processed image: metadata-stripped and in a vision-API-safe format. */
export interface ProcessedImage {
  bytes: Uint8Array
  contentType: 'image/jpeg' | 'image/png'
}

/** Image-processing seam. */
export interface ImageProcessor {
  /**
   * Strips ALL metadata (EXIF) and normalizes the format. HEIC/HEIF must be converted
   * to JPEG here — Anthropic's vision API does not accept HEIC (see FOLLOWUPS.md M4).
   */
  stripAndNormalize(bytes: Uint8Array, contentType: string): Promise<ProcessedImage>
}

export interface PhotoDeps {
  storage: StorageClient
  processor: ImageProcessor
  /** Injectable for tests; defaults to the system clock. */
  now?: () => Date
  /** Injectable for tests; defaults to a random UUID. */
  randomId?: () => string
}

/**
 * Validates, strips EXIF / normalizes format, then stores the PROCESSED bytes (never the
 * originals — the originals carry EXIF). Throws `PHOTO_REJECTED: <reason>` on invalid input
 * before any storage call is made.
 */
export async function storePhoto(
  deps: PhotoDeps,
  bytes: Uint8Array,
  contentType: string,
): Promise<StoredPhoto> {
  const error = validatePhoto(bytes, contentType)
  if (error !== null) {
    throw new Error(`PHOTO_REJECTED: ${error}`)
  }

  const processed = await deps.processor.stripAndNormalize(bytes, contentType)
  const now = (deps.now ?? (() => new Date()))()
  const id = (deps.randomId ?? randomUUID)()
  const ext = processed.contentType === 'image/png' ? 'png' : 'jpg'
  const key = `photos/${now.toISOString().slice(0, 10)}/${id}.${ext}`

  await deps.storage.put({ key, bytes: processed.bytes, contentType: processed.contentType, uploadedAt: now })
  return { key, uploadedAt: now.toISOString() }
}

/** Immediate deletion of a single object — used by the under-18 hard gate. */
export async function deletePhoto(storage: StorageClient, key: string): Promise<void> {
  await storage.delete(key)
}
