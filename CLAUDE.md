# GlowRank — Project Guide for Claude Code

You are working on **GlowRank**, an AI-powered personal style coaching product for adults 18+. This file is your operating manual. Read it fully before writing any code.

If you are in doubt about *anything*, default to asking the human rather than guessing. This product touches user appearance, body image, and mental health. Wrong guesses are not recoverable.

---

## 1. What this project is

GlowRank takes photos and intake answers from a user and produces a personalized 30-day improvement plan covering grooming, skin, wardrobe, photos, body language, and (for users who opt in) makeup. The user pays $9.99 for a one-time report.

The product launches as a **dual-wedge MVP**: men 18–35 (dating-motivated) and women 25–45 (returning daters / new chapter). Both tracks are equally primary. Wedding prep is explicitly deferred to Phase 2.

Phase 1 (what you are building) is **web-only, no native app, no user accounts, no subscription**. See `/docs/PRD.md` Section 1.4 for the full out-of-scope list.

---

## 2. The non-negotiable rules

These rules override product decisions, performance optimization, and your own judgment about what would be "better."

1. **The prompts in `/docs/Prompt_Chain.md` are source of truth.** Implement them literally. Do not "improve," paraphrase, or refactor them without explicit human approval. They have been tone-audited by a clinical reviewer. Your refactor has not been.

2. **Never generate user-facing content yourself.** If a UI string, error message, email, or copy element is not already specified in `/docs/Landing_Copy.md` or `/docs/PRD.md`, ask the human. Do not write your own marketing copy, your own report text, your own product descriptions.

3. **Never weaken or skip the safety filter (Call 5 of the prompt chain).** This is the most attackable surface of the entire product. If something is broken and the apparent fix is "loosen the filter," stop and ask the human.

4. **Never store or display photos beyond what the architecture allows.** Photos are deleted after 30 days, automated, logged. EXIF data is stripped on upload. Photos never used for training. Photos never shared. See `/docs/PRD.md` Section 5.3 and `/docs/Legal_Checklist.md` Section 3 before touching any photo-handling code.

5. **Age gate is non-bypassable.** Users under 18 are refused at intake. Their payment never processes. Their photos are deleted immediately. This is a hard gate, not a soft warning. Test it explicitly.

6. **Banned content is banned, not "minimized."** The prohibited content list in `/docs/Trust_Safety.md` Section 3 is enforced literally. If you see a code path that could emit any banned term, stop and ask.

If you find yourself rationalizing why one of these rules should be flexible "just this once," you are wrong. Stop and ask the human.

---

## 3. Where to find what

| Question | Document |
|----------|----------|
| What is the product, who is the user, what's the business model | `/docs/Business_Plan.md` |
| What does Phase 1 include / exclude, exact technical requirements | `/docs/PRD.md` |
| What can the AI say, what can it never say, how do we detect vulnerable users | `/docs/Trust_Safety.md` — read this twice |
| The actual prompts to use for each API call | `/docs/Prompt_Chain.md` |
| Landing page copy, intake form text, email sequence, ad creative briefs | `/docs/Landing_Copy.md` |
| Week-by-week launch timeline, ad budget, channel plan | `/docs/Launch_Plan.md` |
| Year 1 financial scenarios, unit economics, CAC/LTV math | `/docs/Financial_Model.xlsx` |
| Legal compliance areas, required user-facing pages, consent language | `/docs/Legal_Checklist.md` |

If you are about to write code that touches user appearance, body, mental health, or any output the user will see, the relevant doc is `/docs/Trust_Safety.md`. Always.

---

## 4. Tech stack (locked — do not substitute without approval)

- **Landing pages:** Framer (variants A, B, C) — not custom code
- **Intake form:** Typeform or Tally
- **Payments:** Stripe Checkout (hosted, not embedded)
- **Backend orchestration:** Vercel serverless functions or Make.com
- **AI provider:** Anthropic API (primary), OpenAI (fallback only)
- **Photo storage:** Cloudflare R2 or AWS S3 with 30-day TTL
- **PDF rendering:** Puppeteer or PDFShift
- **Email:** Resend or Postmark
- **Analytics:** Plausible or PostHog (privacy-friendly only)

Do not introduce a database for user accounts. Phase 1 is account-less by design. Do not add Redis, ElasticSearch, or anything "for performance" without explicit need.

---

## 5. Model selection for AI calls

Each call in the 5-call chain has a specific model assignment. Do not change these without approval:

| Call | Recommended model | Why |
|------|------------------|-----|
| Call 1 — Safety Pre-Check | Claude Haiku (latest) | Text-only, fast, cheap |
| Call 2 — Photo Analysis | Claude Sonnet (latest) | Multimodal vision required |
| Call 3 — Score & Prioritize | Claude Sonnet (latest) | Reasoning-heavy |
| Call 4 — Report Generation | Claude Opus (latest) | Tone discipline matters most here |
| Call 5 — Safety Filter | Claude Sonnet (latest) | Independent of Call 4 model |

When configuring the API, always use the latest production model alias for the relevant tier. Do not pin to a specific dated version unless instructed — Anthropic deprecates old versions and you'll get hit by it.

Budget target: under $1.20 per report total API cost. If your implementation exceeds this, ask.

---

## 6. The workflow I expect from you

This is how a typical session should go. Do not skip steps.

### Step 1 — Plan, do not code

When given a new task, your first response is a plan, not code. Include:

- What you understand the task to be (in your own words)
- The files you propose to create or modify
- Any ambiguity you need resolved before proceeding
- Any architectural decision the human needs to make

Do not write code in this first response. Wait for approval.

### Step 2 — Scaffold before features

Before adding any feature, the project skeleton must exist: routes scaffolded, empty components, a failing test suite, basic CI, deploys-to-staging working. If the skeleton isn't there, that's your first task.

### Step 3 — Small commits

Each commit should be one logical change. If you find yourself writing more than ~200 lines of new code without committing, you're going too fast. Stop, commit, ask for review.

### Step 4 — Review every diff

After any non-trivial change, summarize what changed and what could break. Be specific. "Refactored the report module" is not a summary. "Moved Call 4's regeneration loop from `report.ts` to `regeneration.ts` because the test suite was getting tangled — risk: the retry counter is now reset across calls, need to verify" is a summary.

### Step 5 — Tests are not optional

For anything touching the prompt chain, the safety filter, the photo deletion job, or the age gate: tests must exist before the feature is considered complete. Use Vitest or Jest. Mock the API calls in tests — never hit the real AI in test runs.

---

## 7. When to ask the human

Ask the human when:

- You're about to write user-facing copy that isn't already in the docs
- You're about to modify any prompt in `/docs/Prompt_Chain.md`
- You're about to change a safety check or filter rule
- A test is failing and the "fix" would weaken what the test was checking
- You're considering adding a new dependency
- You're considering changing a tech stack choice from Section 4
- You're about to write code that touches photos, payments, or anything legal
- You hit any ambiguity that would require you to guess what the founder wants

Do not ask when:

- A linter complains and the fix is obvious
- A typo needs fixing
- You're refactoring internal utility code with no user-facing impact and no prompt/safety touch
- A test needs a more specific assertion

When you do ask, ask one clear question, not a list of seven.

---

## 8. Failure modes to actively guard against

These are things you are likely to do wrong on this project unless you catch yourself. They've come up in adjacent projects.

### "I'll just make the prompt a bit better"

You will be tempted to rewrite the prompts in `/docs/Prompt_Chain.md` because you can spot ways to make them shorter or more elegant. **Don't.** They have been tone-audited. Your improvements have not. Implement them character-for-character.

### "I'll add a quick toggle for the safety filter for testing"

Do not add a way to disable the safety filter, even for testing. If you need to test the rest of the pipeline without the filter, mock the filter to always pass — do not add a "disable filter" flag, environment variable, or admin override. Those flags get left on in production. Ask history.

### "I'll generate placeholder copy for now"

If the copy isn't in `/docs/Landing_Copy.md`, do not generate a placeholder. Either ask the human, or use a literal `TODO: copy needed` marker that fails the linter. Placeholder copy makes it into production. Document this fact, do not test it.

### "The intake form needs more fields"

Do not add intake fields beyond what's in `/docs/PRD.md` Section 3.2 without asking. Each field reduces conversion. The current set is calibrated.

### "Let me cache the AI responses for performance"

Do not cache AI report outputs. Each report is personal. Caching across users is a privacy violation. Caching for a single user across re-purchases is also incorrect — they paid for a fresh analysis. Ask if you think you need a cache somewhere.

### "I'll improve the model selection logic to use a cheaper model"

The model selection in Section 5 is a product decision, not a cost optimization. If costs are exceeding budget, raise it with the human — do not silently downgrade Opus to Sonnet for report generation.

---

## 9. Logging, observability, and what to never log

Log these:
- Funnel events (landing_visit, cta_clicked, intake_started, photos_uploaded, checkout_started, payment_success, report_delivered, upsell_shown, upsell_purchased, nps_submitted, refund_requested). See `/docs/PRD.md` Section 9.1.
- API call metadata (call number, model, latency, retry count, filter scores)
- Safety filter outcomes (PASS / REGENERATE / HARD_FAIL with reason categories)
- Variant attribution (which landing variant the user came from)
- Errors with stack traces

Never log these:
- The actual photos
- The actual report contents (log the metadata only)
- The actual free-text intake responses (log only "free-text submitted: yes/no" and a length)
- Email addresses in plaintext error logs (hash or redact)
- Payment details — Stripe handles this, never touch the raw card data
- Anything that would let an engineer reconstruct a user's appearance from logs

If you find yourself logging something to "make debugging easier" and it touches user privacy, stop and ask.

---

## 10. Deployment and environments

- `main` branch deploys to production
- `staging` branch deploys to staging environment with synthetic data only
- Never run real ad spend against staging
- Never put production API keys in `.env` files committed to git
- All secrets go through Vercel environment variables or the equivalent
- The photo deletion cron job must run in production from day 1 — do not defer this

Do not push to `main` without explicit human approval. Ever.

---

## 11. What "done" means for a feature

A feature is done when:

- [ ] Tests exist and pass
- [ ] The diff has been reviewed by the human
- [ ] No banned content can be emitted through any code path
- [ ] No PII is logged
- [ ] If the feature touches photos, the deletion path is tested
- [ ] If the feature touches the prompt chain, the prompts match the doc literally
- [ ] If the feature touches user-facing copy, the copy matches the doc literally
- [ ] Staging deploy succeeded
- [ ] The change is one logical commit (or rebased to look like one)

"It works on my machine" is not done. "The happy path works" is not done. "I think the safety filter still catches it" is not done — test it.

---

## 12. A final note on tone

The product is built on the discipline that you do not call users ugly, you do not pathologize aging, you do not weight-shame, you do not recommend procedures, you do not compare users to celebrities. This discipline lives in the prompts and in the safety filter — but it also lives in every error message, every email subject line, every loading screen, every refund acknowledgment.

When you write code that produces text the user will see, ask yourself: would a thoughtful, kind, slightly-older friend say this? If the answer is no, ask the human for the right phrasing. Do not invent it yourself.

The brand is the product. The tone is the brand. Protect both.

---

*This file is the operating contract. If a future session of Claude Code is reading this and the instructions seem outdated, ask the human to update them rather than improvising.*
