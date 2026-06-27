# Engineering follow-ups

Deferred risks and open decisions surfaced during the build. Resolve each before the
relevant code path goes live. The product/safety docs in `/docs` remain source of truth;
this file is engineering tracking only.

## M1 — Verify Anthropic model aliases before any real (non-mocked) call (DONE)
- `claude-sonnet-4-6` and `claude-opus-4-7` bare aliases confirmed valid.
- `claude-haiku-4-5` bare alias not confirmed — updated to dated pin
  `claude-haiku-4-5-20251001` (the only known valid Haiku 4.5 ID).
- **Status:** DONE.

## M2 — Opus-on-Call-4 vs the $1.20/report budget
CLAUDE.md §5 assigns Opus to Call 4; `Prompt_Chain.md`'s cost table assumes Sonnet.
Opus likely pushes women's-with-makeup reports past the §5 ceiling.
- **Resolve:** measure real Call 4 cost once implemented; raise with founder before
  launch. Do NOT silently downgrade the model (§8).
- **Status:** open. **Blocks:** launch cost sign-off (not code).

## M3 — Orchestrator must honor the fail-closed contracts (ADDRESSED)
`runSafetyPrecheck` (Call 1) and `runSafetyFilter` (Call 5) throw on unparseable/invalid
output and must never be treated as `PASS`/deliver.
- **Status:** ADDRESSED in `src/chain/orchestrator.ts` — a thrown Call 1 or Call 5, an
  exhausted regenerate loop, and a deterministic banned-term hit all resolve to
  non-delivery (`hard_fail`). Covered by orchestrator tests. Keep this invariant if the
  orchestrator is refactored.

## M4 — Photo storage + image-processor adapters (MOSTLY ADDRESSED)
- **`ImageProcessor`** — built: `src/photos/image-processor.ts` (sharp 0.34.5 / libvips
  8.17.3). Re-encodes to JPEG (strips EXIF; converts HEIC/HEIF → JPEG). **HEIF input
  support confirmed** on this machine, so no `heic-convert` needed. Verify it also holds on
  the deploy runtime (Vercel) — sharp's HEIF support is platform-dependent.
- **`StorageClient`** — built: `src/photos/s3-storage.ts` (S3-compatible, R2 or S3 via env;
  `list()` uses object `LastModified` as upload time for the TTL sweep).
- **Deletion cron** — `/api/cron/delete-photos` now authorizes then actually runs
  `deleteExpiredPhotos`. **Requires the `PHOTO_*` env vars** + a bucket; 500s (not silent
  no-op) if unconfigured. Recommended: also set a bucket lifecycle rule as belt-and-suspenders.
- **Still open (rolls into M6):** wiring upload in `api/intake.ts` (validate → strip → store)
  and a `get(key)` fetch path so the generate flow can hand processed bytes to Call 2.
- **Status:** core adapters done + deletion live. Remaining bits tracked under M6.

## M5 — Modified-report variants for ED / MEDICAL / AGING flags
Call 1 can return `FLAG_ED`, `FLAG_MEDICAL`, `FLAG_AGING`, which Trust_Safety §2.2/§2.3/§2.4
route to a *modified* report (ED → omit body-composition + ED resources; MEDICAL → no skin
advice + dermatologist referral; AGING → reframe tone, no anti-aging language). Call 4's
prompt is the STANDARD report only — there is no approved modified variant, and serving a
standard report to an ED-flagged user is an incident (Trust_Safety §7.1).
- **Interim (built):** the orchestrator returns `status: 'held'` for these flags — it does
  NOT generate a standard report. They need manual handling / a resource path.
- **Resolve:** design modified Call 4 modes (new prompt work → founder sign-off), plus the
  resource pages and the held-user flow.
- **Design (NEW):** engineering design written — see [M5_DESIGN.md](M5_DESIGN.md). Threads a
  `ReportMode` through the existing Call 4/5 loop (no chain fork); build order AGING → MEDICAL
  → ED. Code is gated on owner/clinical deliverables (approved prompt variants, ED delivery
  email copy, 2 resource pages). Until those exist, keep returning `held`.
- **Status:** design done; implementation open. **Blocks:** automated handling of ED/MEDICAL/AGING users.

## M6 — Fulfillment execution layer + API handlers
`src/fulfillment/plan.ts` decides the post-generation actions. **Done so far:**
- Stripe webhook signature verification + event routing (`src/payments/stripe.ts`,
  `api/stripe-webhook.ts`) — on a PAID checkout, yields a `generate` action with the order
  ref. Does NOT yet trigger generation or refund.
- Account-less **order store** (`src/orders/order-store.ts`) — intake + photo refs as JSON
  at `orders/{id}.json` via a shared `BlobStore` (`src/storage/blob-store.ts`).
- **Report hosting** — `src/reports/report-store.ts` + `src/reports/render-html.ts`
  (marked → noindex HTML) + `api/report/[id].ts` (validates id, serves report, 404 if
  missing). The write side (saving a delivered report) is wired when the generate flow lands.

**Decisions needed from the founder before the rest:**
- **Email copy gap (blocker):** only the report-delivery email exists (Landing_Copy §8.1).
  The crisis / BDD / wedding-waitlist / hard-fail-apology emails are NOT written anywhere —
  needed before the email layer can be built (CLAUDE.md §2 rule 2 forbids inventing them).
- **Email provider:** Resend or Postmark (§4).
- **PDF:** Puppeteer or PDFShift (§4) — Puppeteer needs a serverless Chromium on Vercel.
- **Analytics provider:** Plausible or PostHog (§4).
- **Order linking / store:** how a Checkout Session maps to the stored intake + photo keys
  (proposal: store the order in object storage keyed by an order id; set it as the
  Session's `client_reference_id`). Account-less (CLAUDE.md §4).
  - **ADDRESSED:** `api/checkout.ts` + `src/payments/checkout.ts` create a hosted Checkout
    Session for an existing order, setting `client_reference_id` + `metadata.order_id` (both
    read by `routeStripeEvent`). Front-end flow: `api/intake` → `{ orderId }` → POST
    `api/checkout` → `{ url }` → redirect. Product name + $9.99 price are verbatim from
    Landing_Copy §6.1; `STRIPE_PRICE_ID` (optional) overrides inline price_data. Idempotent per
    order id. **Note:** Apple/Google Pay come from the Stripe dashboard's payment-method config.
- **Refund execution:** explicit go-ahead to write code that issues Stripe refunds (§7).

**Build status — all M6 items complete:**
- `src/fulfillment/run.ts` — spine built; all seams wired (email, refund, queue, flag, analytics).
- `api/generate.ts` — auth-gated internal trigger; wires all deps; BlockedSeamError → 503.
- `api/stripe-webhook.ts` — verifies signature, routes event, fires generate, returns 200.
- `api/intake.ts` — multipart parse, age gate, flagged-email check, photo store, order create.
- `src/analytics/events.ts` — PostHog, serverless-safe, no-op if key absent.
- `src/payments/refund.ts` — Stripe refunds via paymentIntentId stored on Order.
- `src/pdf/generate.ts` — PDFShift REST, Basic auth, returns Uint8Array.
- `src/email/send.ts` + `src/email/templates.ts` — Resend, report_delivery wired verbatim.
  crisis/BDD/wedding-waitlist/hard-fail-apology throw BlockedSeamError (copy not yet written).
- **Open product questions:** (a) CRISIS/BDD/WEDDING refused users — immediate photo delete
  or 30-day TTL? (b) comms to `held` (ED/MEDICAL/AGING) users. (c) the 4 missing email copies.
- **Status:** DONE (core build). Blocked on email copy + M5 for non-happy paths.

## 3d — Manual-review queue (DONE)
- `src/review/queue.ts` — BlobStore-backed, keys `review/{YYYY-MM-DD}/{orderId}.json`.
  Strips reportMarkdown before storing (no report content in logs). `scripts/list-reviews.ts`
  for human reviewer (S3 ListObjectsV2). Wired into `api/generate.ts`.
- **Status:** DONE.

## 3e — Flagged-emails store (DONE)
- `src/flagged-emails/store.ts` — HMAC-SHA256 keyed by `FLAGGED_EMAIL_SECRET`, normalises
  email, BlobStore-backed. `api/intake.ts` checks before accepting a new order.
- **Status:** DONE.
