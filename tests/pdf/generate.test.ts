import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  mockFetch.mockReset()
  vi.stubEnv('PDFSHIFT_API_KEY', 'test-pdfshift-key')
})

const { generatePdf } = await import('../../src/pdf/generate')

describe('generatePdf', () => {
  it('POSTs HTML to PDFShift with Basic auth and returns Uint8Array', async () => {
    const fakeBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // %PDF
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => fakeBytes.buffer,
    })

    const result = await generatePdf('<html><body>Report</body></html>')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.pdfshift.io/v3/convert/pdf',
      expect.objectContaining({ method: 'POST' }),
    )
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    const auth = (options.headers as Record<string, string>)['Authorization']
    expect(auth).toMatch(/^Basic /)
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('throws PDFSHIFT_ERROR on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => 'invalid source',
    })
    await expect(generatePdf('<bad>')).rejects.toThrow('PDFSHIFT_ERROR')
  })

  it('throws if PDFSHIFT_API_KEY is not set', async () => {
    vi.stubEnv('PDFSHIFT_API_KEY', '')
    await expect(generatePdf('<html></html>')).rejects.toThrow('PDFSHIFT_API_KEY')
  })
})
