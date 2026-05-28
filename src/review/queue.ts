import type { BlobStore } from '../storage/blob-store'
import type { ManualReviewContext } from '../fulfillment/run'

// Append-only manual-review queue backed by BlobStore (FOLLOWUPS 3d).
// Stores one entry per order at review/{YYYY-MM-DD}/{orderId}.json.
// Never stores reportMarkdown (CLAUDE.md §9 — log metadata only, never content).

export interface ManualReviewQueue {
  enqueue(ctx: ManualReviewContext): Promise<void>
}

export function createBlobManualReviewQueue(store: BlobStore): ManualReviewQueue {
  return {
    async enqueue({ orderId, outcome, plan }) {
      const date = new Date().toISOString().slice(0, 10)

      // Strip reportMarkdown — log metadata only (CLAUDE.md §9).
      const safeOutcome =
        outcome.status === 'delivered'
          ? { status: outcome.status, filter: outcome.filter }
          : outcome

      const entry = {
        orderId,
        outcome: safeOutcome,
        plan,
        enqueuedAt: new Date().toISOString(),
      }

      await store.putText(
        `review/${date}/${orderId}.json`,
        JSON.stringify(entry, null, 2),
        'application/json',
      )
    },
  }
}
