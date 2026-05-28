import { marked } from 'marked'

// Renders a delivered report's Markdown (from Call 4) to a standalone, readable HTML page.
// The report content is our own filtered model output — not arbitrary user input. `noindex`
// keeps personal reports out of search engines.
//
// NOTE: marked passes raw HTML through. Reports are tone/safety-filtered model output, so
// the risk is low, but if reports ever include untrusted content, add HTML sanitization.

const STYLES = [
  'body{max-width:720px;margin:0 auto;padding:2rem 1.25rem;color:#1a1a1a;',
  'font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
  'h1,h2,h3{line-height:1.25}hr{border:0;border-top:1px solid #eee;margin:2rem 0}',
  'ul{padding-left:1.25rem}',
].join('')

export function renderReportHtml(markdown: string): string {
  const body = marked.parse(markdown, { async: false })
  return [
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="robots" content="noindex">',
    '<title>GlowRank Report</title>',
    `<style>${STYLES}</style></head><body>`,
    body,
    '</body></html>',
  ].join('')
}
