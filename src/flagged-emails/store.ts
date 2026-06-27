import { createHmac } from 'node:crypto'
import type { BlobStore } from '../storage/blob-store'

// Flagged-email store for BDD re-purchase prevention (FOLLOWUPS 3e, Trust_Safety §2.1).
// Emails are stored as HMAC-SHA256(secret, normalised_email) — no plaintext email ever
// written to storage or logs (CLAUDE.md §9). The HMAC secret defeats rainbow tables.

export interface FlaggedEmailStore {
  flagEmail(emailAddress: string): Promise<void>
  isEmailFlagged(emailAddress: string): Promise<boolean>
}

export function createBlobFlaggedEmailStore(store: BlobStore, secret: string): FlaggedEmailStore {
  function hash(email: string): string {
    return createHmac('sha256', secret).update(email.toLowerCase().trim()).digest('hex')
  }

  return {
    async flagEmail(email) {
      const key = `flagged-emails/${hash(email)}.json`
      await store.putText(
        key,
        JSON.stringify({ flaggedAt: new Date().toISOString() }),
        'application/json',
      )
    },

    async isEmailFlagged(email) {
      const key = `flagged-emails/${hash(email)}.json`
      return (await store.getText(key)) !== null
    },
  }
}

export function createBlobFlaggedEmailStoreFromEnv(store: BlobStore): FlaggedEmailStore {
  const secret = process.env.FLAGGED_EMAIL_SECRET
  if (secret === undefined || secret === '') {
    throw new Error('FLAGGED_EMAIL_SECRET env var is required for the flagged-email store')
  }
  return createBlobFlaggedEmailStore(store, secret)
}
