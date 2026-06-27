import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createS3BlobStoreFromEnv } from '../src/storage/blob-store'
import { createOrderStore } from '../src/orders/order-store'
import { createS3StorageClientFromEnv } from '../src/photos/s3-storage'
import { createReportStore } from '../src/reports/report-store'
import { renderReportHtml } from '../src/reports/render-html'
import { runChain } from '../src/chain/orchestrator'
import { runGenerateForOrder, BlockedSeamError, type GenerateDeps } from '../src/fulfillment/run'
import { createBlobManualReviewQueue } from '../src/review/queue'
import { createBlobFlaggedEmailStoreFromEnv } from '../src/flagged-emails/store'
import { refundOrder } from '../src/payments/refund'
import { generatePdf } from '../src/pdf/generate'
import { sendEmailViaCopy } from '../src/email/send'
import { track } from '../src/analytics/events'

// Internal trigger endpoint — called by stripe-webhook.ts after a verified payment.
// Never exposed to users. Auth: Authorization: Bearer <GENERATE_SECRET>.

function isAuthorized(authHeader: string | undefined, secret: string | undefined): boolean {
  return typeof secret === 'string' && secret.length > 0 && authHeader === `Bearer ${secret}`
}

function buildDeps(): GenerateDeps {
  const blobStore = createS3BlobStoreFromEnv()
  const orderStore = createOrderStore(blobStore)
  const reportStore = createReportStore(blobStore)
  const queue = createBlobManualReviewQueue(blobStore)
  const flaggedEmails = createBlobFlaggedEmailStoreFromEnv(blobStore)

  return {
    orderStore,
    storage: createS3StorageClientFromEnv(),
    reportStore,
    runChain,
    enqueueManualReview: (ctx) => queue.enqueue(ctx),
    flagEmail: (email) => flaggedEmails.flagEmail(email),

    refund: async (orderId) => {
      const order = await orderStore.get(orderId)
      const piId = order?.stripePaymentIntentId
      if (!piId) throw new Error(`REFUND_FAILED: no paymentIntentId for order ${orderId}`)
      await refundOrder(piId)
    },

    sendEmail: async (payload) => {
      // For report_delivery: fetch the stored markdown, render HTML, generate PDF (if configured),
      // then send via Resend. PDF generation is best-effort — email still sends if PDFShift fails.
      let pdfBytes: Uint8Array | undefined
      if (payload.kind === 'report_delivery') {
        try {
          const markdown = await reportStore.get(payload.reportId)
          if (markdown && process.env.PDFSHIFT_API_KEY) {
            const html = renderReportHtml(markdown)
            pdfBytes = await generatePdf(html)
          }
        } catch (err) {
          console.error(
            'pdf generation failed (email will send without attachment):',
            (err as Error).message,
          )
        }
      }
      await sendEmailViaCopy(payload, pdfBytes)
    },

    track,
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

  // Store the PaymentIntent ID immediately — needed for any refund this order may trigger.
  const paymentIntentId: unknown = req.body?.paymentIntentId
  const deps = buildDeps()
  if (typeof paymentIntentId === 'string' && paymentIntentId.length > 0) {
    try {
      await deps.orderStore.setPaymentIntent?.(orderId, paymentIntentId)
    } catch (err) {
      // Log but don't fail — the generation should still proceed; refunds can be issued manually.
      console.error('setPaymentIntent failed:', (err as Error).message, { orderId })
    }
  }

  let result
  try {
    result = await runGenerateForOrder(deps, orderId)
  } catch (err) {
    const msg = (err as Error).message
    if (msg.startsWith('ORDER_NOT_FOUND')) {
      res.status(404).json({ error: 'ORDER_NOT_FOUND', orderId })
      return
    }
    if (err instanceof BlockedSeamError) {
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
    ...(result.alreadyFulfilled ? { alreadyFulfilled: true } : {}),
  })
}
