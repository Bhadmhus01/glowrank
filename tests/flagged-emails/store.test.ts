import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createBlobFlaggedEmailStore } from '../../src/flagged-emails/store'
import type { BlobStore } from '../../src/storage/blob-store'

const SECRET = 'test-secret-do-not-use-in-production'

function makeBlobStore(): BlobStore {
  const data = new Map<string, string>()
  return {
    putText: vi.fn(async (key, text) => {
      data.set(key, text)
    }),
    getText: vi.fn(async (key) => data.get(key) ?? null),
    delete: vi.fn(async (key) => {
      data.delete(key)
    }),
  }
}

describe('createBlobFlaggedEmailStore', () => {
  let store: BlobStore

  beforeEach(() => {
    store = makeBlobStore()
  })

  it('flagEmail writes a key under flagged-emails/', async () => {
    const fes = createBlobFlaggedEmailStore(store, SECRET)
    await fes.flagEmail('user@example.com')

    const [key] = (store.putText as ReturnType<typeof vi.fn>).mock.calls[0] as [string]
    expect(key).toMatch(/^flagged-emails\/[a-f0-9]{64}\.json$/)
  })

  it('never writes the plaintext email to storage', async () => {
    const fes = createBlobFlaggedEmailStore(store, SECRET)
    await fes.flagEmail('user@example.com')

    const [, text] = (store.putText as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string]
    expect(text).not.toContain('user@example.com')
  })

  it('isEmailFlagged returns true after flagging', async () => {
    const fes = createBlobFlaggedEmailStore(store, SECRET)
    await fes.flagEmail('user@example.com')
    expect(await fes.isEmailFlagged('user@example.com')).toBe(true)
  })

  it('isEmailFlagged returns false for an unflagged email', async () => {
    const fes = createBlobFlaggedEmailStore(store, SECRET)
    expect(await fes.isEmailFlagged('nobody@example.com')).toBe(false)
  })

  it('normalises email before hashing (case, whitespace)', async () => {
    const fes = createBlobFlaggedEmailStore(store, SECRET)
    await fes.flagEmail('  User@Example.COM  ')
    expect(await fes.isEmailFlagged('user@example.com')).toBe(true)
  })

  it('same email + different secret produces different keys', async () => {
    const s1 = makeBlobStore()
    const s2 = makeBlobStore()
    await createBlobFlaggedEmailStore(s1, 'secret-a').flagEmail('user@example.com')
    await createBlobFlaggedEmailStore(s2, 'secret-b').flagEmail('user@example.com')
    const k1 = (s1.putText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    const k2 = (s2.putText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(k1).not.toBe(k2)
  })

  it('stores flaggedAt timestamp in the entry', async () => {
    const fes = createBlobFlaggedEmailStore(store, SECRET)
    await fes.flagEmail('user@example.com')
    const [, text] = (store.putText as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string]
    const entry = JSON.parse(text)
    expect(typeof entry.flaggedAt).toBe('string')
  })
})
