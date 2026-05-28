import { describe, it, expect } from 'vitest'
import type { BlobStore } from '../../src/storage/blob-store'
import { createReportStore } from '../../src/reports/report-store'

function fakeBlob() {
  const store = new Map<string, string>()
  const blob: BlobStore = {
    putText: async (k, t) => {
      store.set(k, t)
    },
    getText: async (k) => store.get(k) ?? null,
    delete: async (k) => {
      store.delete(k)
    },
  }
  return { blob, store }
}

describe('report store', () => {
  it('saves a report under reports/{id}.md and reads it back', async () => {
    const { blob, store } = fakeBlob()
    const reports = createReportStore(blob)
    await reports.save('rep1', '# Your GlowRank Report\n\nHi.')
    expect(store.get('reports/rep1.md')).toBe('# Your GlowRank Report\n\nHi.')
    expect(await reports.get('rep1')).toBe('# Your GlowRank Report\n\nHi.')
  })

  it('returns null for an unknown report', async () => {
    const { blob } = fakeBlob()
    expect(await createReportStore(blob).get('nope')).toBeNull()
  })
})
