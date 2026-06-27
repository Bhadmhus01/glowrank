import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createBlobManualReviewQueue } from '../../src/review/queue'
import type { BlobStore } from '../../src/storage/blob-store'
import type { ManualReviewContext } from '../../src/fulfillment/run'
import type { GenerationOutcome } from '../../src/chain/orchestrator'
import type { FulfillmentPlan } from '../../src/fulfillment/plan'

const BASE_PLAN: FulfillmentPlan = {
  deliverReport: false,
  refund: true,
  deletePhotosImmediately: false,
  flagEmailToPreventRepurchase: false,
  manualReview: true,
  email: 'hard_fail_apology',
}

function makeBlobStore(): BlobStore {
  const data = new Map<string, string>()
  return {
    putText: vi.fn(async (key, text) => { data.set(key, text) }),
    getText: vi.fn(async (key) => data.get(key) ?? null),
    delete: vi.fn(async (key) => { data.delete(key) }),
  }
}

describe('createBlobManualReviewQueue', () => {
  let store: BlobStore

  beforeEach(() => { store = makeBlobStore() })

  it('writes to review/{date}/{orderId}.json', async () => {
    const queue = createBlobManualReviewQueue(store)
    const ctx: ManualReviewContext = {
      orderId: 'order-123',
      outcome: { status: 'hard_fail', reasons: ['banned_term'] },
      plan: BASE_PLAN,
    }
    await queue.enqueue(ctx)

    const date = new Date().toISOString().slice(0, 10)
    expect(store.putText).toHaveBeenCalledWith(
      `review/${date}/order-123.json`,
      expect.any(String),
      'application/json',
    )
  })

  it('stores orderId, outcomeStatus, plan, and enqueuedAt', async () => {
    const queue = createBlobManualReviewQueue(store)
    const ctx: ManualReviewContext = {
      orderId: 'order-abc',
      outcome: { status: 'hard_fail', reasons: ['r1', 'r2'] },
      plan: BASE_PLAN,
    }
    await queue.enqueue(ctx)

    const [, text] = (store.putText as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string]
    const entry = JSON.parse(text)
    expect(entry.orderId).toBe('order-abc')
    expect(entry.outcome.status).toBe('hard_fail')
    expect(entry.outcome.reasons).toEqual(['r1', 'r2'])
    expect(entry.plan).toEqual(BASE_PLAN)
    expect(typeof entry.enqueuedAt).toBe('string')
  })

  it('strips reportMarkdown from delivered outcome', async () => {
    const queue = createBlobManualReviewQueue(store)
    const deliveredOutcome: GenerationOutcome = {
      status: 'delivered',
      reportMarkdown: 'FULL REPORT CONTENT — must not be stored',
      filter: { verdict: 'PASS', toneScores: { warmth: 8, specificity: 8, agency: 8, motivation: 8 }, regenerateReasons: [], hardFailReasons: [], structuralCheck: { allSectionsPresent: true, disclaimersPresent: true, makeupCorrectlyPresentOrAbsent: true, wordCount: 1000 }, notesForRegeneration: '' },
    }
    const ctx: ManualReviewContext = {
      orderId: 'order-delivered',
      outcome: deliveredOutcome,
      plan: { ...BASE_PLAN, deliverReport: true, refund: false, email: 'report_delivery' },
    }
    await queue.enqueue(ctx)

    const [, text] = (store.putText as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string]
    const entry = JSON.parse(text)
    expect(entry.outcome.reportMarkdown).toBeUndefined()
    expect(entry.outcome.status).toBe('delivered')
  })

  it('stores classification for refused outcome', async () => {
    const queue = createBlobManualReviewQueue(store)
    const ctx: ManualReviewContext = {
      orderId: 'order-refused',
      outcome: { status: 'refused', classification: 'FLAG_CRISIS', action: 'CRISIS_RESOURCES' },
      plan: { ...BASE_PLAN, email: 'crisis_resources' },
    }
    await queue.enqueue(ctx)

    const [, text] = (store.putText as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string]
    const entry = JSON.parse(text)
    expect(entry.outcome.classification).toBe('FLAG_CRISIS')
    expect(entry.outcome.action).toBe('CRISIS_RESOURCES')
  })

  it('stores classification for held outcome', async () => {
    const queue = createBlobManualReviewQueue(store)
    const ctx: ManualReviewContext = {
      orderId: 'order-held',
      outcome: { status: 'held', classification: 'FLAG_ED', action: 'MODIFIED_ED' },
      plan: { ...BASE_PLAN, refund: false, email: 'none' },
    }
    await queue.enqueue(ctx)

    const [, text] = (store.putText as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string]
    const entry = JSON.parse(text)
    expect(entry.outcome.status).toBe('held')
    expect(entry.outcome.classification).toBe('FLAG_ED')
  })
})
