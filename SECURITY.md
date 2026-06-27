# Security Policy

## Reporting a vulnerability

**Do not open a public GitHub issue for security problems.**

Email **security@glowrank.co** (or the founder directly) with details and reproduction steps.
You'll get an acknowledgement within 48 hours and a remediation timeline once triaged.

## Data protection posture

GlowRank handles photos and appearance data, so privacy is a first-class constraint
(see [`CLAUDE.md`](CLAUDE.md) §9 and [`docs/Trust_Safety.md`](docs/Trust_Safety.md)):

- **Photos** are EXIF-stripped on upload, stored with a **30-day TTL**, deleted immediately for
  under-18 refusals, never used for training, and never shared.
- **No PII in logs** — never photos, report contents, raw free-text intake, plaintext emails, or
  payment data. Metadata only.
- **Payments** go through Stripe hosted Checkout; raw card data never touches our servers.
- **Account-less** by design — no user database in Phase 1.
- **Secrets** live only in environment variables (Vercel), never committed. See `.env.example`.

## Dependency security

- CI runs `npm audit --omit=dev --audit-level=high` on every PR: a **production** dependency with
  a high/critical advisory **fails the build**.
- **Current state: production dependencies report 0 known vulnerabilities.**
- Remaining advisories are confined to **dev/build-only** transitive dependencies of
  `@vercel/node` (used solely for local serverless types; not part of the deployed function
  bundle). These are tracked and bumped via Dependabot rather than force-overridden, to avoid
  destabilizing the Vercel build.
- Dependabot opens weekly PRs for npm and GitHub Actions updates.

## Supported versions

Only the latest `main` is supported. Phase 1 is pre-launch; there are no released versions to
back-patch.
