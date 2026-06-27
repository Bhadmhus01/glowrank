import type { IntakeJson } from '../types'
import type { PhotoCategory } from '../chain/call2-photo-analysis'
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

export interface Order {
  id: string
  intake: IntakeJson
  photos: OrderPhoto[]
  createdAt: string // ISO 8601
  /** Set when the Stripe webhook fires — needed for refunds. Never log in plaintext. */
  stripePaymentIntentId?: string
}

const keyFor = (id: string): string => `orders/${id}.json`

export interface OrderStore {
  put(order: Order): Promise<void>
  get(id: string): Promise<Order | null>
  /** Stores the Stripe PaymentIntent ID after payment confirmation. Optional — only called from the webhook path. */
  setPaymentIntent?(id: string, paymentIntentId: string): Promise<void>
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
  }
}
