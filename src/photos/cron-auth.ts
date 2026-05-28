// Guards /api/cron/* so it cannot be invoked publicly. Vercel Cron sends
// `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is configured.

/** Fails closed: rejects if the secret is unset or the header doesn't match exactly. */
export function isAuthorizedCronRequest(
  authHeader: string | undefined,
  secret: string | undefined,
): boolean {
  if (!secret) return false
  return authHeader === `Bearer ${secret}`
}
