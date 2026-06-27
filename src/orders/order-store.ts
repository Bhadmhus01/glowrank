import type { IntakeJson } from '../types'
import type { PhotoCategory } from '../chain/call2-photo-analysis'
import type { GenerationOutcome } from '../chain/orchestrator'
import type { BlobStore } from '../storage/blob-store'

// An order is the intake + stored photo references for a paid (or pending) report. Keyed by
// an id that is set as the Stripe Checkout client_reference_id, so the webhook can look it
// up on payment. Account-less; lives in the blob store under orders/.

export interface OrderPhoto {
  category: PhotoCategory
  /** Storage key of the processed (EXIF-stripped) photo. */
  key: string
  mediaType: 'image/jpeg' | 'image/png'
}

/**
 * Recorded once generation reaches a terminal outcome. Its presence makes the generate trigger
 * idempotent — Stripe can re-send `checkout.session.completed`, and a failed run can be safely
 * replayed by re-POSTing to /api/generate (only orders WITHOUT this re-run).
 */
export interface OrderFulfillment {
  /**
   * The terminal chain outcome. For a 'delivered' outcome, `reportMarkdown` is redacted to ''
   * before storage — the report lives only in the report store under `reportId`, never
   * duplicated into the order JSON (CLAUDE.md §9).
   */
  outcome: GenerationOutcome
  /** Present iff a report was delivered. */
  reportId?: string
  /** ISO 8601 timestamp the order reached its terminal outcome. */
  at: string
}

export interface Order {
  id: string
  intake: IntakeJson
  photos: OrderPhoto[]
  createdAt: string // ISO 8601
  /** Set when the Stripe webhook fires — needed for refunds. Never log in plaintext. */
  stripePaymentIntentId?: string
  /** Set once generation reaches a terminal outcome. Drives idempotency / replay. */
  fulfillment?: OrderFulfillment
}

const keyFor = (id: string): string => `orders/${id}.json`

export interface OrderStore {
  put(order: Order): Promise<void>
  get(id: string): Promise<Order | null>
  /** Stores the Stripe PaymentIntent ID after payment confirmation. Optional — only called from the webhook path. */
  setPaymentIntent?(id: string, paymentIntentId: string): Promise<void>
  /** Records the terminal outcome for idempotency / replay. Optional — only the generate path calls it. */
  markFulfilled?(id: string, fulfillment: OrderFulfillment): Promise<void>
}

export function createOrderStore(blob: BlobStore): OrderStore {
  return {
    async put(order) {
      await blob.putText(keyFor(order.id), JSON.stringify(order), 'application/json')
    },
    async get(id) {
      const text = await blob.getText(keyFor(id))
      return text === null ? null : (JSON.parse(text) as Order)
    },
    async setPaymentIntent(id, paymentIntentId) {
      const text = await blob.getText(keyFor(id))
      if (text === null) throw new Error(`ORDER_NOT_FOUND: ${id}`)
      const order = JSON.parse(text) as Order
      await blob.putText(
        keyFor(id),
        JSON.stringify({ ...order, stripePaymentIntentId: paymentIntentId }),
        'application/json',
      )
    },
    async markFulfilled(id, fulfillment) {
      const text = await blob.getText(keyFor(id))
      if (text === null) throw new Error(`ORDER_NOT_FOUND: ${id}`)
      const order = JSON.parse(text) as Order
      await blob.putText(keyFor(id), JSON.stringify({ ...order, fulfillment }), 'application/json')
    },
  }
}
