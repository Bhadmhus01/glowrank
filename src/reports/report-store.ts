import type { BlobStore } from '../storage/blob-store'

// Delivered reports, stored as Markdown under reports/{id}.md and served at their shareable
// URL (api/report/[id]). The id is a non-guessable token (PRD §3.2 Step 5).

const keyFor = (id: string): string => `reports/${id}.md`

export interface ReportStore {
  save(id: string, markdown: string): Promise<void>
  /** Returns the report Markdown, or null if not found. */
  get(id: string): Promise<string | null>
}

export function createReportStore(blob: BlobStore): ReportStore {
  return {
    async save(id, markdown) {
      await blob.putText(keyFor(id), markdown, 'text/markdown; charset=utf-8')
    },
    async get(id) {
      return blob.getText(keyFor(id))
    },
  }
}
