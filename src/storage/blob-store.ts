import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'

// Small text-blob store over S3/R2 — used for order records and delivered reports. Separate
// from the photo StorageClient (which deals in image bytes + a TTL sweep). Reuses the same
// bucket via key prefixes (orders/, reports/). Account-less (CLAUDE.md §4).

export interface BlobStore {
  putText(key: string, text: string, contentType: string): Promise<void>
  /** Returns the object text, or null if the key does not exist. */
  getText(key: string): Promise<string | null>
  delete(key: string): Promise<void>
}

export interface BlobStoreConfig {
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  endpoint?: string
  region?: string
}

export function createS3BlobStore(config: BlobStoreConfig): BlobStore {
  const client = new S3Client({
    region: config.region ?? 'auto',
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    ...(config.endpoint !== undefined ? { endpoint: config.endpoint, forcePathStyle: true } : {}),
  })

  return {
    async putText(key, text, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: text,
          ContentType: contentType,
        }),
      )
    },
    async getText(key) {
      try {
        const res = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }))
        return (await res.Body?.transformToString()) ?? null
      } catch (err) {
        if ((err as { name?: string }).name === 'NoSuchKey') return null
        throw err
      }
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }))
    },
  }
}

export function createS3BlobStoreFromEnv(): BlobStore {
  const bucket = process.env.PHOTO_BUCKET
  const accessKeyId = process.env.PHOTO_STORAGE_ACCESS_KEY_ID
  const secretAccessKey = process.env.PHOTO_STORAGE_SECRET_ACCESS_KEY
  if (bucket === undefined || accessKeyId === undefined || secretAccessKey === undefined) {
    throw new Error(
      'Storage not configured: set PHOTO_BUCKET, PHOTO_STORAGE_ACCESS_KEY_ID, PHOTO_STORAGE_SECRET_ACCESS_KEY',
    )
  }
  const config: BlobStoreConfig = { bucket, accessKeyId, secretAccessKey }
  if (process.env.PHOTO_STORAGE_ENDPOINT !== undefined)
    config.endpoint = process.env.PHOTO_STORAGE_ENDPOINT
  if (process.env.AWS_REGION !== undefined) config.region = process.env.AWS_REGION
  return createS3BlobStore(config)
}
