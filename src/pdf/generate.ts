// PDF generation via PDFShift REST API (CLAUDE.md §4). No SDK — PDFShift is a simple
// POST endpoint. Requires PDFSHIFT_API_KEY env var.

const PDFSHIFT_ENDPOINT = 'https://api.pdfshift.io/v3/convert/pdf'

/**
 * Converts an HTML string to a PDF and returns the raw bytes.
 * Throws if PDFSHIFT_API_KEY is not set or if the API returns an error.
 */
export async function generatePdf(html: string): Promise<Uint8Array> {
  const apiKey = process.env.PDFSHIFT_API_KEY
  if (!apiKey) throw new Error('PDFSHIFT_API_KEY is not set')

  // PDFShift auth: HTTP Basic with api_key as username, empty password.
  const credentials = Buffer.from(`${apiKey}:`).toString('base64')

  const response = await fetch(PDFSHIFT_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ source: html }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`PDFSHIFT_ERROR: ${response.status} — ${detail}`)
  }

  return new Uint8Array(await response.arrayBuffer())
}
