import { describe, it, expect, vi } from 'vitest'
import { runGenerateForOrder, BlockedSeamError } from '../../src/fulfillment/run'
import type { Order } from '../../src/orders/order-store'
import type { GenerationOutcome } from '../../src/chain/orchestrator'
import type { StorageClient } from '../../src/photos/storage'
import type { IntakeJson, FilterResult } from '../../src/types'

const INTAKE: IntakeJson = {
  age: 28,
  gender: 'man',
  goal: 'dating',
  budgetTier: '100-300',
  heightCm: 175,
  bodyType: 'average',
  stylePreferences: [],
  makeupOptin: false,
  email: 'user@example.com',
}

const ORDER: Order = {
  id: 'ord_1',
  intake: INTAKE,
  photos: [
    { category: 'face-front', key: 'photos/2026-05-22/a.jpg', mediaType: 'image/jpeg' },
    { category: 'full-body', key: 'photos/2026-05-22/b.jpg', mediaType: 'image/jpeg' },
  ],
  createdAt: '2026-05-22T00:00:00Z',
}

const PASS_FILTER: FilterResult = {
  verdict: 'PASS',
  hardFailReasons: [],
  regenerateReasons: [],
  toneScores: { warmth: 8, specificity: 8, agency: 8, motivation: 8 },
  structuralCheck: {
    allSectionsPresent: true,
    disclaimersPresent: true,
    makeupCorrectlyPresentOrAbsent: true,
    wordCount: 2100,
  },
  notesForRegeneration: '',
}

function fixtures(outcome: GenerationOutcome, order: Order | null = ORDER) {
  const savedReports = new Map<string, string>()
  const deletedKeys: string[] = []
  const fetchedKeys: string[] = []

  const orderStore = { put: vi.fn(), get: vi.fn().mockResolvedValue(order), markFulfilled: vi.fn() }

  const storage: StorageClient = {
    put: async () => {},
    get: async (key: string) => {
      fetchedKeys.push(key)
      return { bytes: new Uint8Array([1, 2, 3]), contentType: 'image/jpeg' as const }
    },
    delete: async (key: string) => {
      deletedKeys.push(key)
    },
    list: async () => [],
  }

  const reportStore = {
    save: vi.fn(async (id: string, markdown: string) => {
      savedReports.set(id, markdown)
    }),
    get: vi.fn(),
  }

  const runChain = vi.fn().mockResolvedValue(outcome)
  const sendEmail = vi.fn().mockResolvedValue(undefined)
  const refund = vi.fn().mockResolvedValue(undefined)
  const enqueueManualReview = vi.fn().mockResolvedValue(undefined)
  const flagEmail = vi.fn().mockResolvedValue(undefined)
  const track = vi.fn()

  return {
    orderStore,
    storage,
    reportStore,
    runChain,
    sendEmail,
    refund,
    enqueueManualReview,
    flagEmail,
    track,
    savedReports,
    deletedKeys,
    fetchedKeys,
  }
}

describe('runGenerateForOrder', () => {
  it('throws ORDER_NOT_FOUND when the order is missing', async () => {
    const fx = fixtures({ status: 'hard_fail', reasons: [] }, null)
    await expect(
      runGenerateForOrder(
        {
          orderStore: fx.orderStore,
          storage: fx.storage,
          reportStore: fx.reportStore,
          runChain: fx.runChain,
        },
        'missing',
      ),
    ).rejects.toThrow('ORDER_NOT_FOUND')
    expect(fx.runChain).not.toHaveBeenCalled()
  })

  it('fetches each photo key and hands the chain the intake + AnalysisImage[]', async () => {
    const fx = fixtures({ status: 'delivered', reportMarkdown: '# r', filter: PASS_FILTER })
    await runGenerateForOrder(
      {
        orderStore: fx.orderStore,
        storage: fx.storage,
        reportStore: fx.reportStore,
        runChain: fx.runChain,
        sendEmail: fx.sendEmail,
        newReportId: () => 'rid_1',
      },
      'ord_1',
    )
    expect(fx.fetchedKeys).toEqual(['photos/2026-05-22/a.jpg', 'photos/2026-05-22/b.jpg'])
    const chainArg = fx.runChain.mock.calls[0][0]
    expect(chainArg.intake).toEqual(INTAKE)
    expect(chainArg.images).toHaveLength(2)
    expect(chainArg.images[0]).toMatchObject({ category: 'face-front', mediaType: 'image/jpeg' })
    expect(chainArg.images[1]).toMatchObject({ category: 'full-body', mediaType: 'image/jpeg' })
    expect(chainArg.images[0].bytes).toBeInstanceOf(Uint8Array)
  })

  it('delivered → saves the report, sends report_delivery, tracks report_delivered', async () => {
    const fx = fixtures({
      status: 'delivered',
      reportMarkdown: '# Your report',
      filter: PASS_FILTER,
    })
    const result = await runGenerateForOrder(
      {
        orderStore: fx.orderStore,
        storage: fx.storage,
        reportStore: fx.reportStore,
        runChain: fx.runChain,
        sendEmail: fx.sendEmail,
        refund: fx.refund,
        track: fx.track,
        newReportId: () => 'rid_abc',
      },
      'ord_1',
    )

    expect(fx.savedReports.get('rid_abc')).toBe('# Your report')
    expect(fx.sendEmail).toHaveBeenCalledWith({
      kind: 'report_delivery',
      to: 'user@example.com',
      reportId: 'rid_abc',
    })
    expect(fx.refund).not.toHaveBeenCalled()
    expect(fx.track).toHaveBeenCalledWith('report_delivered', { gender: 'man' })
    expect(fx.track).not.toHaveBeenCalledWith('refund_requested', expect.anything())
    expect(result.outcome.status).toBe('delivered')
    expect(result.plan.deliverReport).toBe(true)
    expect(result.reportId).toBe('rid_abc')
  })

  it('delivered with no sendEmail seam → BLOCKED_EMAIL_SEND_NOT_WIRED (report still saved)', async () => {
    const fx = fixtures({ status: 'delivered', reportMarkdown: '# r', filter: PASS_FILTER })
    await expect(
      runGenerateForOrder(
        {
          orderStore: fx.orderStore,
          storage: fx.storage,
          reportStore: fx.reportStore,
          runChain: fx.runChain,
          newReportId: () => 'rid_abc',
        },
        'ord_1',
      ),
    ).rejects.toBeInstanceOf(BlockedSeamError)
    // Report was persisted before the seam check — the spine is single-shot, not idempotent.
    expect(fx.savedReports.has('rid_abc')).toBe(true)
  })

  it('hard_fail → refund + manual review + hard_fail_apology + track refund_requested', async () => {
    const fx = fixtures({ status: 'hard_fail', reasons: ['x'] })
    await runGenerateForOrder(
      {
        orderStore: fx.orderStore,
        storage: fx.storage,
        reportStore: fx.reportStore,
        runChain: fx.runChain,
        sendEmail: fx.sendEmail,
        refund: fx.refund,
        enqueueManualReview: fx.enqueueManualReview,
        track: fx.track,
      },
      'ord_1',
    )

    expect(fx.refund).toHaveBeenCalledWith('ord_1')
    expect(fx.enqueueManualReview).toHaveBeenCalledTimes(1)
    expect(fx.sendEmail).toHaveBeenCalledWith({ kind: 'hard_fail_apology', to: 'user@example.com' })
    expect(fx.savedReports.size).toBe(0)
    expect(fx.track).toHaveBeenCalledWith('refund_requested', { gender: 'man' })
    expect(fx.track).not.toHaveBeenCalledWith('report_delivered', expect.anything())
  })

  it('hard_fail with no refund seam → BLOCKED_REFUND_NOT_AUTHORIZED', async () => {
    const fx = fixtures({ status: 'hard_fail', reasons: ['x'] })
    await expect(
      runGenerateForOrder(
        {
          orderStore: fx.orderStore,
          storage: fx.storage,
          reportStore: fx.reportStore,
          runChain: fx.runChain,
        },
        'ord_1',
      ),
    ).rejects.toThrow('BLOCKED_REFUND_NOT_AUTHORIZED')
  })

  it('held → manual review only; NO refund, NO email, NO delivery', async () => {
    const fx = fixtures({ status: 'held', classification: 'FLAG_ED', action: 'MODIFIED_ED' })
    await runGenerateForOrder(
      {
        orderStore: fx.orderStore,
        storage: fx.storage,
        reportStore: fx.reportStore,
        runChain: fx.runChain,
        enqueueManualReview: fx.enqueueManualReview,
        sendEmail: fx.sendEmail,
        refund: fx.refund,
        track: fx.track,
      },
      'ord_1',
    )

    expect(fx.enqueueManualReview).toHaveBeenCalledTimes(1)
    expect(fx.refund).not.toHaveBeenCalled()
    expect(fx.sendEmail).not.toHaveBeenCalled()
    expect(fx.savedReports.size).toBe(0)
    expect(fx.track).not.toHaveBeenCalled()
  })

  it('refused REFUSE_AGE → refund + immediate photo delete + NO email', async () => {
    const fx = fixtures({ status: 'refused', classification: 'FLAG_AGE', action: 'REFUSE_AGE' })
    await runGenerateForOrder(
      {
        orderStore: fx.orderStore,
        storage: fx.storage,
        reportStore: fx.reportStore,
        runChain: fx.runChain,
        refund: fx.refund,
        sendEmail: fx.sendEmail,
        track: fx.track,
      },
      'ord_1',
    )

    expect(fx.deletedKeys).toEqual(['photos/2026-05-22/a.jpg', 'photos/2026-05-22/b.jpg'])
    expect(fx.refund).toHaveBeenCalledWith('ord_1')
    expect(fx.sendEmail).not.toHaveBeenCalled()
  })

  it('refused CRISIS_RESOURCES → refund + manual review + crisis_resources email', async () => {
    const fx = fixtures({
      status: 'refused',
      classification: 'FLAG_CRISIS',
      action: 'CRISIS_RESOURCES',
    })
    await runGenerateForOrder(
      {
        orderStore: fx.orderStore,
        storage: fx.storage,
        reportStore: fx.reportStore,
        runChain: fx.runChain,
        refund: fx.refund,
        sendEmail: fx.sendEmail,
        enqueueManualReview: fx.enqueueManualReview,
        track: fx.track,
      },
      'ord_1',
    )

    expect(fx.refund).toHaveBeenCalledWith('ord_1')
    expect(fx.enqueueManualReview).toHaveBeenCalledTimes(1)
    expect(fx.sendEmail).toHaveBeenCalledWith({ kind: 'crisis_resources', to: 'user@example.com' })
  })

  it('refused BDD_RESOURCES → flag email + refund + manual review + bdd_resources email', async () => {
    const fx = fixtures({ status: 'refused', classification: 'FLAG_BDD', action: 'BDD_RESOURCES' })
    await runGenerateForOrder(
      {
        orderStore: fx.orderStore,
        storage: fx.storage,
        reportStore: fx.reportStore,
        runChain: fx.runChain,
        refund: fx.refund,
        sendEmail: fx.sendEmail,
        enqueueManualReview: fx.enqueueManualReview,
        flagEmail: fx.flagEmail,
        track: fx.track,
      },
      'ord_1',
    )

    expect(fx.flagEmail).toHaveBeenCalledWith('user@example.com')
    expect(fx.sendEmail).toHaveBeenCalledWith({ kind: 'bdd_resources', to: 'user@example.com' })
    expect(fx.refund).toHaveBeenCalledWith('ord_1')
    expect(fx.enqueueManualReview).toHaveBeenCalledTimes(1)
  })

  it('refused BDD_RESOURCES with no flagEmail seam → BLOCKED_FLAGGED_EMAIL_STORE_MISSING', async () => {
    const fx = fixtures({ status: 'refused', classification: 'FLAG_BDD', action: 'BDD_RESOURCES' })
    await expect(
      runGenerateForOrder(
        {
          orderStore: fx.orderStore,
          storage: fx.storage,
          reportStore: fx.reportStore,
          runChain: fx.runChain,
          refund: fx.refund,
          sendEmail: fx.sendEmail,
          enqueueManualReview: fx.enqueueManualReview,
        },
        'ord_1',
      ),
    ).rejects.toThrow('BLOCKED_FLAGGED_EMAIL_STORE_MISSING')
  })

  it('refused WEDDING_WAITLIST → refund + wedding_waitlist email (no manual review, no flag)', async () => {
    const fx = fixtures({
      status: 'refused',
      classification: 'FLAG_WEDDING',
      action: 'WEDDING_WAITLIST',
    })
    await runGenerateForOrder(
      {
        orderStore: fx.orderStore,
        storage: fx.storage,
        reportStore: fx.reportStore,
        runChain: fx.runChain,
        refund: fx.refund,
        sendEmail: fx.sendEmail,
        enqueueManualReview: fx.enqueueManualReview,
        flagEmail: fx.flagEmail,
        track: fx.track,
      },
      'ord_1',
    )

    expect(fx.sendEmail).toHaveBeenCalledWith({ kind: 'wedding_waitlist', to: 'user@example.com' })
    expect(fx.refund).toHaveBeenCalledWith('ord_1')
    expect(fx.enqueueManualReview).not.toHaveBeenCalled()
    expect(fx.flagEmail).not.toHaveBeenCalled()
  })

  it('hard_fail with no manual-review seam → BLOCKED_MANUAL_REVIEW_QUEUE_MISSING', async () => {
    const fx = fixtures({ status: 'hard_fail', reasons: ['x'] })
    await expect(
      runGenerateForOrder(
        {
          orderStore: fx.orderStore,
          storage: fx.storage,
          reportStore: fx.reportStore,
          runChain: fx.runChain,
          refund: fx.refund,
          sendEmail: fx.sendEmail,
        },
        'ord_1',
      ),
    ).rejects.toThrow('BLOCKED_MANUAL_REVIEW_QUEUE_MISSING')
  })

  it('records fulfillment after a delivered run, redacting reportMarkdown (CLAUDE.md §9)', async () => {
    const fx = fixtures({
      status: 'delivered',
      reportMarkdown: '# secret report',
      filter: PASS_FILTER,
    })
    await runGenerateForOrder(
      {
        orderStore: fx.orderStore,
        storage: fx.storage,
        reportStore: fx.reportStore,
        runChain: fx.runChain,
        sendEmail: fx.sendEmail,
        newReportId: () => 'rid_keep',
        now: () => '2026-06-27T00:00:00.000Z',
      },
      'ord_1',
    )

    expect(fx.orderStore.markFulfilled).toHaveBeenCalledTimes(1)
    const [id, fulfillment] = fx.orderStore.markFulfilled.mock.calls[0]
    expect(id).toBe('ord_1')
    expect(fulfillment.reportId).toBe('rid_keep')
    expect(fulfillment.at).toBe('2026-06-27T00:00:00.000Z')
    expect(fulfillment.outcome.status).toBe('delivered')
    // The report text must NOT be duplicated into the order JSON.
    expect(fulfillment.outcome.reportMarkdown).toBe('')
  })

  it('already-fulfilled order short-circuits: no chain re-run, no re-save, no re-email, no re-track', async () => {
    const fulfilledOrder: Order = {
      ...ORDER,
      fulfillment: {
        outcome: { status: 'delivered', reportMarkdown: '', filter: PASS_FILTER },
        reportId: 'rid_done',
        at: '2026-06-01T00:00:00.000Z',
      },
    }
    const fx = fixtures(
      { status: 'delivered', reportMarkdown: '# r', filter: PASS_FILTER },
      fulfilledOrder,
    )
    const result = await runGenerateForOrder(
      {
        orderStore: fx.orderStore,
        storage: fx.storage,
        reportStore: fx.reportStore,
        runChain: fx.runChain,
        sendEmail: fx.sendEmail,
        refund: fx.refund,
        track: fx.track,
      },
      'ord_1',
    )

    expect(result.alreadyFulfilled).toBe(true)
    expect(result.outcome.status).toBe('delivered')
    expect(result.reportId).toBe('rid_done')
    expect(result.plan.deliverReport).toBe(true)
    // None of the side effects re-fire on a replay/duplicate webhook.
    expect(fx.runChain).not.toHaveBeenCalled()
    expect(fx.savedReports.size).toBe(0)
    expect(fx.sendEmail).not.toHaveBeenCalled()
    expect(fx.track).not.toHaveBeenCalled()
    expect(fx.orderStore.markFulfilled).not.toHaveBeenCalled()
    expect(fx.fetchedKeys).toEqual([])
  })

  it('does NOT record fulfillment when a required seam throws (so a retry can complete it)', async () => {
    // hard_fail needs a refund seam; omit it → throws before the fulfillment record.
    const fx = fixtures({ status: 'hard_fail', reasons: ['x'] })
    await expect(
      runGenerateForOrder(
        {
          orderStore: fx.orderStore,
          storage: fx.storage,
          reportStore: fx.reportStore,
          runChain: fx.runChain,
        },
        'ord_1',
      ),
    ).rejects.toThrow('BLOCKED_REFUND_NOT_AUTHORIZED')
    expect(fx.orderStore.markFulfilled).not.toHaveBeenCalled()
  })

  it('a failing markFulfilled does not fail the run (best-effort idempotency)', async () => {
    const fx = fixtures({ status: 'delivered', reportMarkdown: '# r', filter: PASS_FILTER })
    fx.orderStore.markFulfilled.mockRejectedValue(new Error('blob down'))
    const result = await runGenerateForOrder(
      {
        orderStore: fx.orderStore,
        storage: fx.storage,
        reportStore: fx.reportStore,
        runChain: fx.runChain,
        sendEmail: fx.sendEmail,
        newReportId: () => 'rid_x',
      },
      'ord_1',
    )
    expect(result.outcome.status).toBe('delivered')
    expect(fx.savedReports.size).toBe(1)
  })

  it('no track injected → defaults to no-op (no throw on a successful delivered run)', async () => {
    const fx = fixtures({ status: 'delivered', reportMarkdown: '# r', filter: PASS_FILTER })
    await runGenerateForOrder(
      {
        orderStore: fx.orderStore,
        storage: fx.storage,
        reportStore: fx.reportStore,
        runChain: fx.runChain,
        sendEmail: fx.sendEmail,
        newReportId: () => 'rid_x',
      },
      'ord_1',
    )
    expect(fx.savedReports.size).toBe(1)
  })
})
