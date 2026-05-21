// Structured logging with mandatory redaction (CLAUDE.md §9).
//
// NEVER log: photos, report contents, raw intake free-text, email addresses in
// plaintext, payment/card data, or anything that would let someone reconstruct a
// user's appearance. Log metadata only (call number, model, latency, retry count,
// filter scores, funnel events, errors with stack traces).

export type LogLevel = 'info' | 'warn' | 'error'

export function log(level: LogLevel, event: string, meta?: Record<string, unknown>): void {
  throw new Error('NOT_IMPLEMENTED: logger (with PII redaction)')
}

/** Redacts an email to a non-reversible form for safe inclusion in logs. */
export function redactEmail(email: string): string {
  throw new Error('NOT_IMPLEMENTED: email redaction')
}
