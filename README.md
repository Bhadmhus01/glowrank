# GlowRank

[![CI](https://github.com/Bhadmhus01/glowrank/actions/workflows/ci.yml/badge.svg)](https://github.com/Bhadmhus01/glowrank/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D20-3c873a)](.nvmrc)
[![License: UNLICENSED](https://img.shields.io/badge/license-UNLICENSED-red)](LICENSE)

> AI-powered personal style coaching for adults 18+.

GlowRank turns a few photos and a short intake form into a personalized **30-day glow-up plan**
covering grooming, skin, wardrobe, photos, body language, and (opt-in) makeup. One-time **$9.99**
report — web-only, no accounts, no subscription.

This repository is the **Phase 1 backend**: the AI orchestration chain, payment + fulfillment
flow, photo handling, and the trust-&-safety machinery around all of it.

> [!IMPORTANT]
> Read **[`CLAUDE.md`](CLAUDE.md) first** — it is the operating contract for this codebase
> (safety rules, tone discipline, what may never be auto-generated). Everything else flows from it.

---

## How it works

A paid order runs through a **5-call AI chain** ([`src/chain/orchestrator.ts`](src/chain/orchestrator.ts)),
which **fails closed** — any parse/validation failure or exhausted retry resolves to a
non-delivery outcome, never a bad report:

| Call | Purpose                           | Model tier |
| ---- | --------------------------------- | ---------- |
| 1    | Safety pre-check (text)           | Haiku      |
| 2    | Photo analysis (vision)           | Sonnet     |
| 3    | Score & prioritize                | Sonnet     |
| 4    | Report generation (tone-critical) | Opus       |
| 5    | Independent safety filter         | Sonnet     |

End-to-end flow:

```
intake form ─▶ POST /api/intake ─▶ { orderId }
            ─▶ POST /api/checkout ─▶ Stripe hosted Checkout
            ─▶ webhook /api/stripe-webhook ─▶ POST /api/generate (idempotent)
            ─▶ 5-call chain ─▶ fulfillment (deliver / refund / hold / resources)
```

## Tech stack

Node ≥20 · TypeScript (strict) · Vercel serverless functions · Anthropic API ·
S3/R2 (photos, 30-day TTL) · Stripe Checkout · Resend (email) · PDFShift (PDF) · PostHog (analytics).

## Getting started

```bash
nvm use                 # Node 20 (see .nvmrc)
npm install
cp .env.example .env    # fill in secrets — never commit real values
npm run check           # format check + lint + typecheck + tests
```

### Scripts

| Script                                    | What it does                                            |
| ----------------------------------------- | ------------------------------------------------------- |
| `npm run check`                           | format check + lint + typecheck + tests (the full gate) |
| `npm test` / `npm run test:watch`         | run the Vitest suite                                    |
| `npm run test:coverage`                   | tests with a coverage report                            |
| `npm run typecheck`                       | `tsc --noEmit`                                          |
| `npm run lint` / `npm run lint:fix`       | ESLint                                                  |
| `npm run format` / `npm run format:check` | Prettier                                                |
| `npm run report`                          | run a report end-to-end locally (dev harness)           |
| `npm run list-reviews`                    | list the manual-review queue                            |

## Project structure

```
api/        Vercel serverless handlers (intake, checkout, generate, webhook, cron)
src/
  chain/        the 5-call AI orchestration + prompts
  safety/       age gate, banned-terms backstop, classification routing
  fulfillment/  outcome → actions plan + execution spine
  photos/       processing (EXIF strip, HEIC→JPEG), S3/R2 storage, deletion
  payments/     Stripe checkout, webhook routing, refunds
  email/ pdf/ analytics/ reports/ orders/ ...  adapters + stores
docs/       PRD, Trust_Safety, Prompt_Chain, Landing_Copy, Legal_Checklist (source of truth)
tests/      Vitest suite (all external SDKs mocked — never hits real APIs)
```

## Documentation

| Topic                                   | Doc                                            |
| --------------------------------------- | ---------------------------------------------- |
| Operating contract for any code change  | [`CLAUDE.md`](CLAUDE.md)                       |
| Phase 1 spec (in/out of scope)          | [`docs/PRD.md`](docs/PRD.md)                   |
| Non-negotiable safety & tone rules      | [`docs/Trust_Safety.md`](docs/Trust_Safety.md) |
| The actual AI prompts (source of truth) | [`docs/Prompt_Chain.md`](docs/Prompt_Chain.md) |
| All user-facing copy                    | [`docs/Landing_Copy.md`](docs/Landing_Copy.md) |
| Engineering follow-ups & open decisions | [`FOLLOWUPS.md`](FOLLOWUPS.md)                 |
| Security & privacy posture              | [`SECURITY.md`](SECURITY.md)                   |
| How to contribute                       | [`CONTRIBUTING.md`](CONTRIBUTING.md)           |

## Security & privacy

Photos are EXIF-stripped on upload, never used for training, and deleted after 30 days
(immediately for under-18). PII is never logged. See [`SECURITY.md`](SECURITY.md) and
[`CLAUDE.md`](CLAUDE.md) §9. Report a vulnerability per [`SECURITY.md`](SECURITY.md) — do not open
a public issue.

## License

Proprietary — **all rights reserved**. See [`LICENSE`](LICENSE). Not open source.
