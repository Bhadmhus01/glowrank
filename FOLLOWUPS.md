# Engineering follow-ups

Deferred risks and open decisions surfaced during the build. Resolve each before the
relevant code path goes live. The product/safety docs in `/docs` remain source of truth;
this file is engineering tracking only.

## M1 — Verify Anthropic model aliases before any real (non-mocked) call
`src/chain/models.ts` uses `claude-haiku-4-5`, `claude-sonnet-4-6`, `claude-opus-4-7`.
CLAUDE.md §5 says use the latest alias and avoid dated pins, but the only confirmed
Haiku identifier is dated (`claude-haiku-4-5-20251001`). If a bare alias does not
resolve, the request fails at runtime — and mocked tests will not catch it.
- **Resolve:** confirm each alias against Anthropic's current model list; decide alias
  vs. dated pin with the founder (this is the §5 tension).
- **Status:** open. **Blocks:** first real chain call.

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

## M4 — Build the photo storage + image-processor adapters
`src/photos/storage.ts` defines `StorageClient` and `ImageProcessor` seams but no concrete
adapters. Two are needed before photo handling works end to end:
1. **S3-compatible `StorageClient`** (`@aws-sdk/client-s3`) targeting R2 or S3 via env
   (`PHOTO_BUCKET`, `PHOTO_STORAGE_ENDPOINT`, keys). `list()` should surface each object's
   upload time (metadata or LastModified) for the TTL sweep.
2. **`ImageProcessor`** that strips EXIF and converts **HEIC/HEIF → JPEG** — Anthropic's
   vision API does not accept HEIC, so this conversion is required, not optional.
   `sharp` is the usual choice but its HEIC path is platform-finicky on serverless; verify
   on the target runtime (may need `heic-convert` or a lifecycle step).
- Then wire both into `/api/cron/delete-photos` (currently auths then returns 501) and the
  intake handler. Also recommended: a bucket lifecycle rule as belt-and-suspenders.
- Deps deferred because they can't be installed/verified on the current dev machine
  (no Node toolchain present).
- **Status:** open. **Blocks:** real photo upload + actual 30-day deletion in prod.

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
- **Status:** open. **Blocks:** automated handling of ED/MEDICAL/AGING users.

## M6 — Fulfillment execution layer + API handlers
`src/fulfillment/plan.ts` decides the post-generation actions; nothing executes them yet,
and the API handlers (`api/intake.ts`, `api/stripe-webhook.ts`, `api/generate.ts`,
`api/report/[id].ts`) are still 501 stubs. To make the flow real:
1. **Order loading / storage fetch** — load intake + photo keys for an order; fetch
   processed photo bytes → `AnalysisImage[]` (depends on M4 storage adapter).
2. **Stripe** — verify webhook signature on payment_success; issue refunds (`plan.refund`).
   Touches payments — confirm with founder before wiring (CLAUDE.md §7).
3. **Email** — send `plan.email` using copy VERBATIM from `docs/Landing_Copy.md`; never
   invent it (CLAUDE.md §2 rule 2). Needs the delivery + each resource/refusal email copy.
4. **Delivery** — render PDF (M4 image lib adjacent), store the report for its shareable
   URL, serve it from `api/report/[id]`.
5. **Side effects** — immediate photo delete (`plan.deletePhotosImmediately`), email flag,
   manual-review queue, analytics events.
- **Open product questions flagged during the plan:** (a) should refused CRISIS/BDD/WEDDING
  users have photos deleted immediately or follow the 30-day TTL? (b) what comms a `held`
  (ED/MEDICAL/AGING) user receives.
- **Status:** open. **Blocks:** any real end-to-end run.
