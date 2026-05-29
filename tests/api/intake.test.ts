import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- hoisted mocks ----
const { mockStorePhoto, mockIsEmailFlagged, mockOrderStorePut } = vi.hoisted(() => ({
  mockStorePhoto: vi.fn(),
  mockIsEmailFlagged: vi.fn(),
  mockOrderStorePut: vi.fn(),
}))

vi.mock('../../src/storage/blob-store', () => ({ createS3BlobStoreFromEnv: vi.fn(() => ({})) }))
vi.mock('../../src/photos/s3-storage', () => ({ createS3StorageClientFromEnv: vi.fn(() => ({})) }))
vi.mock('../../src/photos/image-processor', () => ({ createSharpImageProcessor: vi.fn(() => ({})) }))
vi.mock('../../src/photos/storage', () => ({ storePhoto: mockStorePhoto }))
vi.mock('../../src/flagged-emails/store', () => ({
  createBlobFlaggedEmailStoreFromEnv: vi.fn(() => ({ isEmailFlagged: mockIsEmailFlagged })),
}))
vi.mock('../../src/orders/order-store', () => ({
  createOrderStore: vi.fn(() => ({ put: mockOrderStorePut })),
}))

// formidable mock — inlined so tests control what gets "parsed"
const mockParse = vi.fn()
vi.mock('formidable', () => ({
  default: vi.fn(() => ({ parse: mockParse })),
}))

// node:fs/promises mock — return a tiny JPEG buffer for any filepath
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(async () => Buffer.from([0xff, 0xd8, 0xff, 0xe0])), // JPEG magic bytes
}))

const { default: handler } = await import('../../api/intake')

// ---- helpers ----
const VALID_INTAKE = JSON.stringify({
  age: 28,
  gender: 'man',
  goal: 'dating',
  budgetTier: '100-300',
  heightCm: 178,
  bodyType: 'athletic',
  stylePreferences: ['casual'],
  makeupOptin: false,
  email: 'user@example.com',
})

function makeReq(method = 'POST'): Record<string, unknown> {
  return { method, headers: {} }
}

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn(), _code: 0, _body: undefined as unknown }
  res.status.mockImplementation((c: number) => { res._code = c; return res })
  res.json.mockImplementation((b: unknown) => { res._body = b; return res })
  return res
}

function goodParseResult(photoCount = 1) {
  const files: Record<string, Array<{ filepath: string; mimetype: string }>> = {}
  for (let i = 0; i < photoCount; i++) {
    const cat = i === 0 ? 'face-front' : 'full-body'
    files[cat] = [...(files[cat] ?? []), { filepath: `/tmp/photo${i}.jpg`, mimetype: 'image/jpeg' }]
  }
  return [{ intake: [VALID_INTAKE] }, files]
}

beforeEach(() => {
  vi.stubEnv('FLAGGED_EMAIL_SECRET', 'test-secret')
  mockStorePhoto.mockReset()
  mockIsEmailFlagged.mockReset()
  mockOrderStorePut.mockReset()
  mockStorePhoto.mockResolvedValue({ key: 'photos/2026-05-28/abc.jpg', uploadedAt: new Date().toISOString() })
  mockIsEmailFlagged.mockResolvedValue(false)
  mockOrderStorePut.mockResolvedValue(undefined)
})

describe('POST /api/intake', () => {
  it('returns 405 for non-POST', async () => {
    const res = makeRes()
    await handler(makeReq('GET') as never, res as never)
    expect(res._code).toBe(405)
  })

  it('returns 400 when intake field is missing from form', async () => {
    mockParse.mockResolvedValue([{}, {}])
    const res = makeRes()
    await handler(makeReq() as never, res as never)
    expect(res._code).toBe(400)
    expect((res._body as { error: string }).error).toBe('FORM_PARSE_ERROR')
  })

  it('returns 400 when intake JSON is invalid', async () => {
    mockParse.mockResolvedValue([{ intake: ['not-json{{{'] }, {}])
    const res = makeRes()
    await handler(makeReq() as never, res as never)
    expect(res._code).toBe(400)
    expect((res._body as { error: string }).error).toBe('INVALID_INTAKE')
  })

  it('returns 400 when intake fields fail validation', async () => {
    const bad = JSON.stringify({ ...JSON.parse(VALID_INTAKE), gender: 'alien' })
    mockParse.mockResolvedValue([{ intake: [bad] }, {}])
    const res = makeRes()
    await handler(makeReq() as never, res as never)
    expect(res._code).toBe(400)
    expect((res._body as { error: string }).error).toBe('INVALID_INTAKE')
  })

  it('returns 400 for under-18 age (hard gate, pre-storage)', async () => {
    const under18 = JSON.stringify({ ...JSON.parse(VALID_INTAKE), age: 17 })
    mockParse.mockResolvedValue([{ intake: [under18] }, {}])
    const res = makeRes()
    await handler(makeReq() as never, res as never)
    expect(res._code).toBe(400)
    expect((res._body as { error: string }).error).toBe('UNDER_18')
    expect(mockStorePhoto).not.toHaveBeenCalled()
  })

  it('returns 400 for flagged email', async () => {
    mockIsEmailFlagged.mockResolvedValue(true)
    mockParse.mockResolvedValue(goodParseResult())
    const res = makeRes()
    await handler(makeReq() as never, res as never)
    expect(res._code).toBe(400)
    expect((res._body as { error: string }).error).toBe('EMAIL_FLAGGED')
    expect(mockStorePhoto).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid photo count (zero photos)', async () => {
    mockParse.mockResolvedValue([{ intake: [VALID_INTAKE] }, {}])
    const res = makeRes()
    await handler(makeReq() as never, res as never)
    expect(res._code).toBe(400)
    expect((res._body as { error: string }).error).toBe('INVALID_PHOTO_COUNT')
  })

  it('returns 400 when a photo is rejected', async () => {
    mockParse.mockResolvedValue(goodParseResult())
    mockStorePhoto.mockRejectedValue(new Error('PHOTO_REJECTED: TOO_LARGE'))
    const res = makeRes()
    await handler(makeReq() as never, res as never)
    expect(res._code).toBe(400)
    expect((res._body as { error: string }).error).toBe('PHOTO_REJECTED')
  })

  it('returns 200 with orderId on success', async () => {
    mockParse.mockResolvedValue(goodParseResult(2))
    const res = makeRes()
    await handler(makeReq() as never, res as never)
    expect(res._code).toBe(200)
    expect(typeof (res._body as { orderId: string }).orderId).toBe('string')
    expect(mockOrderStorePut).toHaveBeenCalledOnce()
  })

  it('stores photos in parallel (storePhoto called once per photo)', async () => {
    mockParse.mockResolvedValue(goodParseResult(3))
    const res = makeRes()
    await handler(makeReq() as never, res as never)
    expect(mockStorePhoto).toHaveBeenCalledTimes(3)
  })
})
