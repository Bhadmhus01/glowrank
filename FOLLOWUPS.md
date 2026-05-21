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

## M3 — Orchestrator must honor Call 1's fail-closed contract
`runSafetyPrecheck` throws on unparseable/invalid output and must never be treated as
`PASS`. The orchestrator (still a stub) must route a thrown Call 1 to non-delivery /
manual review. Do NOT wrap it in a `try/catch` that defaults to PASS (CLAUDE.md §2 rule 3).
- **Resolve:** enforce and test when the orchestrator is built.
- **Status:** open. **Blocks:** orchestrator integration.

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
