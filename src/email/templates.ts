// Email templates — every string here is VERBATIM from docs/Landing_Copy.md (CLAUDE.md §2 rule 2).
// Do not paraphrase, shorten, or "improve" this copy without explicit founder approval.

export interface ReportDeliveryContext {
  reportUrl: string
  pdfAttached: boolean
}

/**
 * Email 1 — Report delivery (sent immediately after generation).
 * Source: docs/Landing_Copy.md §8.1
 */
export function reportDeliveryTemplate(ctx: ReportDeliveryContext): { subject: string; html: string } {
  // Subject verbatim from Landing_Copy.md §8.1
  const subject = 'Your GlowRank report is ready'

  // Body verbatim from Landing_Copy.md §8.1.
  // {{first_name_if_provided}} — intake does not collect first name; greeting omitted.
  // {{report_url}} — substituted below.
  const bodyLines = [
    'Your GlowRank report is ready. View it here:',
    '',
    `<a href="${ctx.reportUrl}">${ctx.reportUrl}</a>`,
    '',
    ctx.pdfAttached ? 'We\'ve also attached a PDF copy.' : '',
    '',
    'A few things to know:',
    '',
    '→ Read the Top 3 Priorities section twice. That\'s the most important part — knowing what to fix first matters more than knowing everything to fix.',
    '',
    '→ Your plan is week-by-week for the next 30 days. Try not to skip ahead.',
    '',
    '→ Not happy with the report for any reason? Just reply to this email within 7 days. Full refund, no questions.',
    '',
    'We\'ll check in with you in a few days to see how it\'s going.',
    '',
    '— The GlowRank Team',
  ].filter((l) => l !== '' || true) // keep structure

  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;line-height:1.6;color:#1a1a1a;max-width:600px;margin:0 auto;padding:2rem 1rem">${bodyLines.map((l) => l === '' ? '<br>' : `<p style="margin:0 0 0.5rem">${l}</p>`).join('')}</body></html>`

  return { subject, html }
}
