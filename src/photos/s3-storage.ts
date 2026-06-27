import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  type ListObjectsV2CommandInput,
} from '@aws-sdk/client-s3'
import type { StorageClient, StorageObject, PutObjectParams, ProcessedImage } from './storage'

/**
 * Photos are normalized to JPEG/PNG on upload, so a stored object should only ever carry one
 * of these. Anything else means a corrupt or tampered object — fail rather than feed an
 * unsupported type to the vision API.
 */
function asProcessedContentType(contentType: string | undefined): 'image/jpeg' | 'image/png' {
  if (contentType === 'image/jpeg' || contentType === 'image/png') return contentType
  throw new Error(`STORAGE_UNSUPPORTED_CONTENT_TYPE: ${contentType ?? 'unknown'}`)
}

// S3-compatible photo storage adapter — works for both AWS S3 and Cloudflare R2 (R2
// exposes an S3 endpoint). The provider is chosen by env, not in code (CLAUDE.md §4).

export interface S3StorageConfig {
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  /** Set for R2 / any S3-compatible endpoint; omit for AWS S3. */
  endpoint?: string
  region?: string
}

export function createS3StorageClient(config: S3StorageConfig): StorageClient {
  const client = new S3Client({
    region: config.region ?? 'auto',
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    // Custom endpoints (R2) generally need path-style addressing.
    ...(config.endpoint !== undefined ? { endpoint: config.endpoint, forcePathStyle: true } : {}),
  })

  return {
    async put(params: PutObjectParams): Promise<void> {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: params.key,
          Body: params.bytes,
          ContentType: params.contentType,
          Metadata: { uploadedat: params.uploadedAt.toISOString() },
        }),
      )
    },

    async get(key: string): Promise<ProcessedImage> {
      const res = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }))
      if (res.Body === undefined) {
        throw new Error(`STORAGE_OBJECT_NOT_FOUND: ${key}`)
      }
      const bytes = await res.Body.transformToByteArray()
      return { bytes, contentType: asProcessedContentType(res.ContentType) }
    },

    async delete(key: string): Promise<void> {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }))
    },

    async list(): Promise<StorageObject[]> {
      const objects: StorageObject[] = []
      let token: string | undefined
      do {
        const input: ListObjectsV2CommandInput = { Bucket: config.bucket }
        if (token !== undefined) input.ContinuationToken = token
        const res = await client.send(new ListObjectsV2Command(input))
        for (const obj of res.Contents ?? []) {
          // Use LastModified as the upload time (photos are written once).
          if (obj.Key !== undefined && obj.LastModified !== undefined) {
            objects.push({ key: obj.Key, uploadedAt: obj.LastModified })
          }
        }
        token = res.IsTruncated === true ? res.NextContinuationToken : undefined
      } while (token !== undefined)
      return objects
    },
  }
}

/** Builds the adapter from env (PHOTO_BUCKET / PHOTO_STORAGE_*). Throws if unconfigured. */
export function createS3StorageClientFromEnv(): StorageClient {
  const bucket = process.env.PHOTO_BUCKET
  const accessKeyId = process.env.PHOTO_STORAGE_ACCESS_KEY_ID
  const secretAccessKey = process.env.PHOTO_STORAGE_SECRET_ACCESS_KEY
  if (bucket === undefined || accessKeyId === undefined || secretAccessKey === undefined) {
    throw new Error(
      'Photo storage not configured: set PHOTO_BUCKET, PHOTO_STORAGE_ACCESS_KEY_ID, PHOTO_STORAGE_SECRET_ACCESS_KEY',
    )
  }
  const config: S3StorageConfig = { bucket, accessKeyId, secretAccessKey }
  if (process.env.PHOTO_STORAGE_ENDPOINT !== undefined)
    config.endpoint = process.env.PHOTO_STORAGE_ENDPOINT
  if (process.env.AWS_REGION !== undefined) config.region = process.env.AWS_REGION
  return createS3StorageClient(config)
}
