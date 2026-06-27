import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BlockedSeamError } from '../../src/fulfillment/run'

const { mockRunGenerate } = vi.hoisted(() => ({ mockRunGenerate: vi.fn() }))

// Mock all env-dependent factory modules so tests never touch real infra.
vi.mock('../../src/storage/blob-store', () => ({ createS3BlobStoreFromEnv: vi.fn(() => ({})) }))
vi.mock('../../src/photos/s3-storage', () => ({ createS3StorageClientFromEnv: vi.fn(() => ({})) }))
vi.mock('../../src/reports/report-store', () => ({ createReportStore: vi.fn(() => ({})) }))
vi.mock('../../src/orders/order-store', () => ({ createOrderStore: vi.fn(() => ({})) }))
vi.mock('../../src/review/queue', () => ({
  createBlobManualReviewQueue: vi.fn(() => ({ enqueue: vi.fn() })),
}))
vi.mock('../../src/flagged-emails/store', () => ({
  createBlobFlaggedEmailStoreFromEnv: vi.fn(() => ({ flagEmail: vi.fn() })),
}))
vi.mock('../../src/chain/orchestrator', () => ({ runChain: vi.fn() }))
vi.mock('../../src/fulfillment/run', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/fulfillment/run')>()
  return { ...original, runGenerateForOrder: mockRunGenerate }
})

// Import handler after mocks are set up.
const { default: handler } = await import('../../api/generate')

function makeReq(
  overrides: {
    method?: string
    authorization?: string | null
    body?: unknown
  } = {},
): Record<string, unknown> {
  const authorization =
    overrides.authorization === undefined
      ? 'Bearer test-secret'
      : (overrides.authorization ?? undefined)
  return {
    method: overrides.method ?? 'POST',
    headers: authorization !== null ? { authorization } : {},
    body: overrides.body ?? { orderId: 'order-123' },
  }
}

function makeRes(): {
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
  _code: number
  _body: unknown
} {
  const res = { status: vi.fn(), json: vi.fn(), _code: 0, _body: undefined as unknown }
  res.status.mockImplementation((code: number) => {
    res._code = code
    return res
  })
  res.json.mockImplementation((body: unknown) => {
    res._body = body
    return res
  })
  return res
}

beforeEach(() => {
  vi.stubEnv('GENERATE_SECRET', 'test-secret')
  mockRunGenerate.mockReset()
})

describe('POST /api/generate', () => {
  it('returns 405 for non-POST methods', async () => {
    const res = makeRes()
    await handler(makeReq({ method: 'GET' }) as never, res as never)
    expect(res._code).toBe(405)
  })

  it('returns 401 when Authorization header is missing', async () => {
    const res = makeRes()
    await handler(makeReq({ authorization: null }) as never, res as never)
    expect(res._code).toBe(401)
  })

  it('returns 401 when Authorization header is wrong', async () => {
    const res = makeRes()
    await handler(makeReq({ authorization: 'Bearer wrong-secret' }) as never, res as never)
    expect(res._code).toBe(401)
  })

  it('returns 400 when orderId is missing', async () => {
    const res = makeRes()
    await handler(makeReq({ body: {} }) as never, res as never)
    expect(res._code).toBe(400)
  })

  it('returns 400 when orderId is empty string', async () => {
    const res = makeRes()
    await handler(makeReq({ body: { orderId: '' } }) as never, res as never)
    expect(res._code).toBe(400)
  })

  it('returns 404 when order is not found', async () => {
    mockRunGenerate.mockRejectedValue(new Error('ORDER_NOT_FOUND: order-missing'))
    const res = makeRes()
    await handler(makeReq({ body: { orderId: 'order-missing' } }) as never, res as never)
    expect(res._code).toBe(404)
    expect((res._body as { error: string }).error).toBe('ORDER_NOT_FOUND')
  })

  it('returns 503 on BlockedSeamError', async () => {
    mockRunGenerate.mockRejectedValue(
      new BlockedSeamError('BLOCKED_REFUND_NOT_AUTHORIZED', 'orderId=order-123'),
    )
    const res = makeRes()
    await handler(makeReq() as never, res as never)
    expect(res._code).toBe(503)
    expect((res._body as { error: string }).error).toBe('BLOCKED_SEAM')
  })

  it('returns 500 on unexpected error', async () => {
    mockRunGenerate.mockRejectedValue(new Error('something unexpected'))
    const res = makeRes()
    await handler(makeReq() as never, res as never)
    expect(res._code).toBe(500)
  })

  it('returns 200 with status on delivered result', async () => {
    mockRunGenerate.mockResolvedValue({
      outcome: { status: 'delivered', reportMarkdown: '...', filter: {} },
      plan: {
        deliverReport: true,
        refund: false,
        deletePhotosImmediately: false,
        flagEmailToPreventRepurchase: false,
        manualReview: false,
        email: 'report_delivery',
      },
      reportId: 'report-abc',
    })
    const res = makeRes()
    await handler(makeReq() as never, res as never)
    expect(res._code).toBe(200)
    expect(res._body).toEqual({ status: 'delivered', reportId: 'report-abc' })
  })

  it('returns 200 with status and no reportId on refused result', async () => {
    mockRunGenerate.mockResolvedValue({
      outcome: { status: 'refused', classification: 'FLAG_CRISIS', action: 'CRISIS_RESOURCES' },
      plan: {
        deliverReport: false,
        refund: true,
        deletePhotosImmediately: false,
        flagEmailToPreventRepurchase: false,
        manualReview: true,
        email: 'crisis_resources',
      },
    })
    const res = makeRes()
    await handler(makeReq() as never, res as never)
    expect(res._code).toBe(200)
    expect(res._body).toEqual({ status: 'refused' })
  })
})
