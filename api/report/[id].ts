import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createS3BlobStoreFromEnv } from '../../src/storage/blob-store'
import { createReportStore } from '../../src/reports/report-store'
import { renderReportHtml } from '../../src/reports/render-html'

// Serves a generated report at its unique shareable URL (PRD §3.2 Step 5). The id is a
// non-guessable token; validated to a safe character set to prevent storage-key traversal.
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const id = req.query.id
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    res.status(400).json({ error: 'INVALID_REPORT_ID' })
    return
  }

  let markdown: string | null
  try {
    markdown = await createReportStore(createS3BlobStoreFromEnv()).get(id)
  } catch (err) {
    console.error('report fetch failed:', (err as Error).message)
    res.status(500).json({ error: 'REPORT_FETCH_FAILED' })
    return
  }

  if (markdown === null) {
    res.status(404).json({ error: 'REPORT_NOT_FOUND' })
    return
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.status(200).send(renderReportHtml(markdown))
}
