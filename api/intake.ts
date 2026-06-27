import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import formidable from 'formidable'
import { createS3BlobStoreFromEnv } from '../src/storage/blob-store'
import { createOrderStore } from '../src/orders/order-store'
import { createS3StorageClientFromEnv } from '../src/photos/s3-storage'
import { createSharpImageProcessor } from '../src/photos/image-processor'
import { storePhoto } from '../src/photos/storage'
import { validatePhotoCount, MAX_PHOTO_BYTES } from '../src/photos/validation'
import { isAgeEligible } from '../src/safety/age-gate'
import { createBlobFlaggedEmailStoreFromEnv } from '../src/flagged-emails/store'
import { validateIntake } from '../src/intake/validate'
import type { PhotoCategory } from '../src/chain/call2-photo-analysis'
import type { OrderPhoto } from '../src/orders/order-store'

// Multipart body — Vercel's built-in parser must be off (same as stripe-webhook.ts).
export const config = { api: { bodyParser: false } }

const PHOTO_CATEGORIES: PhotoCategory[] = [
  'face-front',
  'face-side',
  'full-body',
  'wardrobe',
  'dating-profile',
  'makeup-look',
]

function isPhotoCategory(s: string): s is PhotoCategory {
  return (PHOTO_CATEGORIES as string[]).includes(s)
}

async function parseForm(req: VercelRequest): Promise<{
  intakeRaw: string
  photos: Array<{ category: PhotoCategory; filepath: string; mimetype: string }>
}> {
  const form = formidable({ maxFileSize: MAX_PHOTO_BYTES, maxFiles: 12, keepExtensions: true })
  const [fields, files] = await form.parse(req)

  const intakeRaw = fields.intake?.[0]
  if (typeof intakeRaw !== 'string' || intakeRaw.trim().length === 0) {
    throw new Error('MISSING_INTAKE_FIELD')
  }

  const photos: Array<{ category: PhotoCategory; filepath: string; mimetype: string }> = []
  for (const [fieldName, fileList] of Object.entries(files)) {
    if (!isPhotoCategory(fieldName) || !fileList) continue
    for (const file of fileList) {
      photos.push({
        category: fieldName,
        filepath: file.filepath,
        mimetype: file.mimetype ?? 'image/jpeg',
      })
    }
  }

  return { intakeRaw, photos }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
    return
  }

  // --- Parse & validate ---
  let intakeRaw: string
  let rawPhotos: Array<{ category: PhotoCategory; filepath: string; mimetype: string }>
  try {
    ;({ intakeRaw, photos: rawPhotos } = await parseForm(req))
  } catch (err) {
    const msg = (err as Error).message
    res.status(400).json({ error: 'FORM_PARSE_ERROR', detail: msg })
    return
  }

  let intake
  try {
    intake = validateIntake(JSON.parse(intakeRaw))
  } catch (err) {
    res.status(400).json({ error: 'INVALID_INTAKE', detail: (err as Error).message })
    return
  }

  // --- Age gate (hard, pre-payment, pre-storage) ---
  if (!isAgeEligible(intake.age)) {
    res.status(400).json({ error: 'UNDER_18' })
    return
  }

  // --- Flagged email check (BDD re-purchase prevention, Trust_Safety §2.1) ---
  if (process.env.FLAGGED_EMAIL_SECRET) {
    try {
      const blobStore = createS3BlobStoreFromEnv()
      const flaggedEmails = createBlobFlaggedEmailStoreFromEnv(blobStore)
      if (await flaggedEmails.isEmailFlagged(intake.email)) {
        res.status(400).json({ error: 'EMAIL_FLAGGED' })
        return
      }
    } catch (err) {
      console.error('flagged email check failed:', (err as Error).message)
      // Fail open on infra error — do not block a legitimate user due to a storage error.
    }
  }

  // --- Photo count ---
  if (!validatePhotoCount(rawPhotos.length)) {
    res
      .status(400)
      .json({ error: 'INVALID_PHOTO_COUNT', detail: `got ${rawPhotos.length}, need 1–12` })
    return
  }

  // --- Process + store photos ---
  const storage = createS3StorageClientFromEnv()
  const processor = createSharpImageProcessor()
  const photoDeps = { storage, processor }

  let storedPhotos: OrderPhoto[]
  try {
    storedPhotos = await Promise.all(
      rawPhotos.map(async ({ category, filepath, mimetype }) => {
        const bytes = new Uint8Array(await readFile(filepath))
        const stored = await storePhoto(photoDeps, bytes, mimetype)
        return {
          category,
          key: stored.key,
          // storePhoto always returns JPEG (sharp re-encodes everything)
          mediaType: 'image/jpeg' as const,
        }
      }),
    )
  } catch (err) {
    const msg = (err as Error).message
    if (msg.startsWith('PHOTO_REJECTED')) {
      res.status(400).json({ error: 'PHOTO_REJECTED', detail: msg })
      return
    }
    console.error('photo storage failed:', msg)
    res.status(500).json({ error: 'PHOTO_STORAGE_FAILED' })
    return
  }

  // --- Create order ---
  const orderId = randomUUID()
  try {
    const blobStore = createS3BlobStoreFromEnv()
    await createOrderStore(blobStore).put({
      id: orderId,
      intake,
      photos: storedPhotos,
      createdAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('order store failed:', (err as Error).message)
    res.status(500).json({ error: 'ORDER_STORE_FAILED' })
    return
  }

  // Log only safe metadata — never freeText content or email in plaintext (CLAUDE.md §9).
  console.log('intake completed', {
    orderId,
    gender: intake.gender,
    goal: intake.goal,
    makeupOptin: intake.makeupOptin,
    photoCount: storedPhotos.length,
    hasFreeText: typeof intake.freeText === 'string' && intake.freeText.length > 0,
    freeTextLength: intake.freeText?.length ?? 0,
  })

  res.status(200).json({ orderId })
}
