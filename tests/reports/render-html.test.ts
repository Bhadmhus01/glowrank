import { describe, it, expect } from 'vitest'
import { renderReportHtml } from '../../src/reports/render-html'

describe('renderReportHtml', () => {
  it('renders report Markdown into a standalone HTML page', () => {
    const html = renderReportHtml('# Your GlowRank Report\n\nWarm and **specific**.')
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('<title>GlowRank Report</title>')
    expect(html).toContain('<h1>Your GlowRank Report</h1>')
    expect(html).toContain('<strong>specific</strong>')
  })

  it('marks the page noindex (personal reports stay out of search)', () => {
    expect(renderReportHtml('# r')).toContain('name="robots" content="noindex"')
  })
})
