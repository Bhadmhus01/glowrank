import { describe, it, expect } from 'vitest'
import { isExpired, PHOTO_TTL_DAYS, deleteExpiredPhotos } from '../../src/photos/deletion'
import type { StorageClient, StorageObject } from '../../src/photos/storage'

// 30-day photo TTL (CLAUDE.md §2 rule 4, PRD §5.3).
describe('photo TTL', () => {
  it('uses a 30-day TTL', () => {
    expect(PHOTO_TTL_DAYS).toBe(30)
  })

  it('treats photos older than 30 days as expired', () => {
    const uploaded = new Date('2026-01-01T00:00:00Z')
    const now = new Date('2026-03-01T00:00:00Z') // ~59 days later
    expect(isExpired(uploaded, now)).toBe(true)
  })

  it('keeps photos still within the 30-day window', () => {
    const uploaded = new Date('2026-05-01T00:00:00Z')
    const now = new Date('2026-05-10T00:00:00Z') // 9 days later
    expect(isExpired(uploaded, now)).toBe(false)
  })
})

function fakeStorage(objects: StorageObject[]) {
  const deleted: string[] = []
  const storage: StorageClient = {
    put: async () => {},
    delete: async (key) => {
      deleted.push(key)
    },
    list: async () => objects,
  }
  return { storage, deleted }
}

describe('deleteExpiredPhotos', () => {
  it('deletes only photos past the 30-day TTL and reports counts', async () => {
    const now = new Date('2026-06-01T00:00:00Z')
    const { storage, deleted } = fakeStorage([
      { key: 'old-1', uploadedAt: new Date('2026-01-01T00:00:00Z') }, // expired
      { key: 'recent', uploadedAt: new Date('2026-05-20T00:00:00Z') }, // keep (12 days)
      { key: 'old-2', uploadedAt: new Date('2026-04-01T00:00:00Z') }, // expired (61 days)
    ])

    const result = await deleteExpiredPhotos(storage, now)

    expect(result).toEqual({ deleted: 2, scanned: 3 })
    expect(deleted).toEqual(['old-1', 'old-2'])
    expect(deleted).not.toContain('recent')
  })

  it('deletes nothing when all photos are within TTL', async () => {
    const now = new Date('2026-05-15T00:00:00Z')
    const { storage, deleted } = fakeStorage([
      { key: 'a', uploadedAt: new Date('2026-05-10T00:00:00Z') },
      { key: 'b', uploadedAt: new Date('2026-05-01T00:00:00Z') },
    ])

    const result = await deleteExpiredPhotos(storage, now)

    expect(result).toEqual({ deleted: 0, scanned: 2 })
    expect(deleted).toEqual([])
  })
})
