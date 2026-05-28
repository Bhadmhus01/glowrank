/**
 * Lists pending manual-review entries from the BlobStore.
 * Usage: npm run list-reviews [YYYY-MM-DD]
 * Defaults to today's date if no argument given.
 *
 * Requires PHOTO_BUCKET + PHOTO_STORAGE_* env vars (same bucket as orders/reports).
 */

import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'

const date = process.argv[2] ?? new Date().toISOString().slice(0, 10)
const prefix = `review/${date}/`

const bucket = process.env.PHOTO_BUCKET
const accessKeyId = process.env.PHOTO_STORAGE_ACCESS_KEY_ID
const secretAccessKey = process.env.PHOTO_STORAGE_SECRET_ACCESS_KEY
const endpoint = process.env.PHOTO_STORAGE_ENDPOINT

if (bucket === undefined || accessKeyId === undefined || secretAccessKey === undefined) {
  console.error('Set PHOTO_BUCKET, PHOTO_STORAGE_ACCESS_KEY_ID, PHOTO_STORAGE_SECRET_ACCESS_KEY')
  process.exit(1)
}

const client = new S3Client({
  region: process.env.AWS_REGION ?? 'auto',
  credentials: { accessKeyId, secretAccessKey },
  ...(endpoint !== undefined ? { endpoint, forcePathStyle: true } : {}),
})

const list = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }))
const keys = (list.Contents ?? []).map((o) => o.Key).filter((k): k is string => k !== undefined)

if (keys.length === 0) {
  console.log(`No review entries for ${date}.`)
  process.exit(0)
}

console.log(`\n=== Manual review queue — ${date} (${keys.length} entries) ===\n`)

for (const key of keys) {
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  const text = await res.Body?.transformToString()
  if (text === undefined) continue
  const entry = JSON.parse(text)
  console.log(`--- ${entry.orderId} ---`)
  console.log(`  Outcome : ${entry.outcome.status}${entry.outcome.classification ? ` / ${entry.outcome.classification}` : ''}`)
  if (entry.outcome.reasons?.length > 0) {
    console.log(`  Reasons : ${(entry.outcome.reasons as string[]).join(', ')}`)
  }
  console.log(`  Plan    : refund=${entry.plan.refund} email=${entry.plan.email}`)
  console.log(`  Queued  : ${entry.enqueuedAt}`)
  console.log()
}
