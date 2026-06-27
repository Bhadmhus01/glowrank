import { describe, it, expect } from 'vitest'
import { storePhoto, deletePhoto } from '../../src/photos/storage'
import type { StorageClient, ImageProcessor, PutObjectParams } from '../../src/photos/storage'

function makeDeps() {
  const puts: PutObjectParams[] = []
  const deletes: string[] = []
  const storage: StorageClient = {
    put: async (p) => {
      puts.push(p)
    },
    get: async () => {
      throw new Error('not used in storePhoto tests')
    },
    delete: async (k) => {
      deletes.push(k)
    },
    list: async () => [],
  }
  // Pretend the processor strips EXIF and converts everything to JPEG.
  const processor: ImageProcessor = {
    stripAndNormalize: async () => ({
      bytes: new Uint8Array([9, 9, 9]),
      contentType: 'image/jpeg',
    }),
  }
  return { storage, processor, puts, deletes }
}

describe('storePhoto', () => {
  it('stores the PROCESSED bytes, never the EXIF-bearing originals', async () => {
    const { storage, processor, puts } = makeDeps()
    const now = new Date('2026-05-21T12:00:00Z')
    const result = await storePhoto(
      { storage, processor, now: () => now, randomId: () => 'abc123' },
      new Uint8Array([1, 2, 3, 4]),
      'image/heic',
    )

    expect(puts).toHaveLength(1)
    expect(Array.from(puts[0].bytes)).toEqual([9, 9, 9]) // processed output
    expect(puts[0].contentType).toBe('image/jpeg') // HEIC normalized away
    expect(puts[0].uploadedAt).toEqual(now)
    expect(result.key).toBe('photos/2026-05-21/abc123.jpg')
    expect(result.uploadedAt).toBe('2026-05-21T12:00:00.000Z')
  })

  it('rejects an oversize photo before any storage call', async () => {
    const { storage, processor, puts } = makeDeps()
    await expect(
      storePhoto({ storage, processor }, new Uint8Array(10 * 1024 * 1024 + 1), 'image/jpeg'),
    ).rejects.toThrow(/PHOTO_REJECTED: TOO_LARGE/)
    expect(puts).toHaveLength(0)
  })

  it('rejects an unsupported format before any storage call', async () => {
    const { storage, processor, puts } = makeDeps()
    await expect(
      storePhoto({ storage, processor }, new Uint8Array([1, 2, 3]), 'image/gif'),
    ).rejects.toThrow(/PHOTO_REJECTED: UNSUPPORTED_FORMAT/)
    expect(puts).toHaveLength(0)
  })
})

describe('deletePhoto', () => {
  it('deletes the given key immediately (under-18 gate path)', async () => {
    const { storage, deletes } = makeDeps()
    await deletePhoto(storage, 'photos/2026-05-21/abc123.jpg')
    expect(deletes).toEqual(['photos/2026-05-21/abc123.jpg'])
  })
})
