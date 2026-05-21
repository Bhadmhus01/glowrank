// Email delivery (Resend or Postmark — CLAUDE.md §4).
// IMPORTANT: every subject line and body string must come VERBATIM from
// docs/Landing_Copy.md — never invent user-facing copy (CLAUDE.md §2 rule 2, §8).
// Email addresses are never written to plaintext logs (CLAUDE.md §9).

export interface EmailMessage {
  to: string
  subject: string
  html: string
  attachments?: { filename: string; content: Uint8Array }[]
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  throw new Error('NOT_IMPLEMENTED: email send')
}
