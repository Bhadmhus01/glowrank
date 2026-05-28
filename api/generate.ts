import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createS3BlobStoreFromEnv } from '../src/storage/blob-store'
import { createOrderStore } from '../src/orders/order-store'
import { createS3StorageClientFromEnv } from '../src/photos/s3-storage'
import { createReportStore } from '../src/reports/report-store'
import { runChain } from '../src/chain/orchestrator'
import { runGenerateForOrder, BlockedSeamError, type GenerateDeps } from '../src/fulfillment/run'
import { createBlobManualReviewQueue } from '../src/review/queue'
import { createBlobFlaggedEmailStoreFromEnv } from '../src/flagged-emails/store'

// Internal trigger endpoint — called by stripe-webhook.ts after a verified payment.
// Never exposed to users. Auth: Authorization: Bearer <GENERATE_SECRET>.
//
// Blocked seams (sendEmail, refund, track) are intentionally absent — they throw
// BlockedSeamError if the outcome requires them, returned as 503 so the issue surfaces
// for manual handling rather than silently dropping it (FOLLOWUPS M6).

function isAuthorized(authHeader: string | undefined, secret: string | undefined): boolean {
  return typeof secret === 'string' && secret.length > 0 && authHeader === `Bearer ${secret}`
}

function buildDeps(): GenerateDeps {
  const blobStore = createS3BlobStoreFromEnv()
  const queue = createBlobManualReviewQueue(blobStore)
  const flaggedEmails = createBlobFlaggedEmailStoreFromEnv(blobStore)
  return {
    orderStore: createOrderStore(blobStore),
    storage: createS3StorageClientFromEnv(),
    reportStore: createReportStore(blobStore),
    runChain,
    enqueueManualReview: (ctx) => queue.enqueue(ctx),
    flagEmail: (email) => flaggedEmails.flagEmail(email),
    // sendEmail: blocked — missing copy + provider (FOLLOWUPS M6)
    // refund:    blocked — not yet authorized (CLAUDE.md §7)
    // track:     blocked — analytics provider not chosen (FOLLOWUPS M6)
  }
}

export { buildDeps as _buildDeps } // exported for tests only

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
    return
  }

  if (!isAuthorized(req.headers.authorization, process.env.GENERATE_SECRET)) {
    res.status(401).json({ error: 'UNAUTHORIZED' })
    return
  }

  const orderId: unknown = req.body?.orderId
  if (typeof orderId !== 'string' || orderId.length === 0) {
    res.status(400).json({ error: 'MISSING_ORDER_ID' })
    return
  }

  let result
  try {
    result = await runGenerateForOrder(buildDeps(), orderId)
  } catch (err) {
    const msg = (err as Error).message
    if (msg.startsWith('ORDER_NOT_FOUND')) {
      res.status(404).json({ error: 'ORDER_NOT_FOUND', orderId })
      return
    }
    if (err instanceof BlockedSeamError) {
      // A required side-effect seam is not yet wired. The order and outcome are not lost —
      // the report (if delivered) is saved; the manual-review queue has the entry.
      // Return 503 so the webhook caller can log/alert for manual follow-up.
      console.error('generate blocked seam:', msg, { orderId })
      res.status(503).json({ error: 'BLOCKED_SEAM', detail: msg })
      return
    }
    console.error('generate failed:', msg, { orderId })
    res.status(500).json({ error: 'GENERATE_FAILED' })
    return
  }

  res.status(200).json({
    status: result.outcome.status,
    ...(result.reportId !== undefined ? { reportId: result.reportId } : {}),
  })
}
