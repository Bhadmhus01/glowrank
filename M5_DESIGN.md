# M5 — Modified-report variants (ED / MEDICAL / AGING): engineering design

**Status:** design proposal — not yet built. **Blocked on:** clinical-reviewer-approved prompt
variants + 2 resource pages + 1 follow-up email copy (all owner/clinical deliverables).

This document is engineering tracking only (like `FOLLOWUPS.md`). The product/safety docs in
`/docs` remain source of truth. **No prompts or user-facing copy are authored here** — per
CLAUDE.md §2 rules 1 & 2, those require founder + clinical sign-off and must land in
`/docs/Prompt_Chain.md` and `/docs/Landing_Copy.md` respectively. This is the *code shape* that
will consume them once they exist.

---

## 1. Problem

Call 1 can classify a user as `FLAG_ED`, `FLAG_MEDICAL`, or `FLAG_AGING`. Trust_Safety §2.2 /
§2.4 / §6 require these users to receive a **modified report**, not a refusal and not the
standard report. Serving a standard report to an ED-flagged user is a logged **incident**
(Trust_Safety §7.1: *"A user with ED signals receives an unmodified report with body
composition language."*).

Today the orchestrator has no modified Call 4, so it returns `status: 'held'`
([src/chain/orchestrator.ts:77-82](src/chain/orchestrator.ts)) and
[src/fulfillment/plan.ts:46-49](src/fulfillment/plan.ts) routes `held` → manual review only.
A paying flagged user currently gets **silence + a manual-queue entry** — no report, no email,
no refund. M5 closes that gap.

---

## 2. The three modes (from Trust_Safety)

| Mode | Trigger | Report disposition | Hard content rules |
|------|---------|-------------------|--------------------|
| **ED** (`MODIFIED_ED`) | `FLAG_ED` | Modify, **do not refuse** (§2.2: refusal can read as rejection) | Omit **all** body-composition / weight / body-shape advice. Strengthen grooming, wardrobe-fit, photo-skill, makeup to compensate. Prominent ED-helpline resources. Warm follow-up email. Manual review. |
| **MEDICAL** (`MODIFIED_MEDICAL`) | `FLAG_MEDICAL` | Modify | No skin treatment advice beyond basics; recommend dermatologist consultation for anything beyond basic (§ skin handling). |
| **AGING** (`MODIFIED_AGING`) | `FLAG_AGING` | **Generate normally**, modified tone (§2.4: *not* a hard-refusal category) | Reframe skin/grooming around "rested, confident version of yourself," never "younger." Forbid the words `anti-aging`, `younger`, `reverse`, `erase`, `age spots`(-as-defect). Short neutral-aging note in the report. |

Note the asymmetry: **AGING** is the lightest touch (tone reframing + an added banned-word set
on an otherwise-standard report), while **ED** is the heaviest (structural section removal +
resources + a distinct delivery email). Build in that order of confidence.

---

## 3. Proposed architecture

The chain already isolates report generation (Call 4) behind `runReportGeneration`. The design
threads a **report mode** through the existing generation path rather than forking the chain.

### 3.1 A `ReportMode` parameter on Call 4

```
type ReportMode = 'STANDARD' | 'MODIFIED_ED' | 'MODIFIED_MEDICAL' | 'MODIFIED_AGING'
```

`runReportGeneration(intake, observations, scores, notes, mode)` selects the prompt variant by
`mode`. Each non-standard mode maps to an **approved prompt block in `/docs/Prompt_Chain.md`**
(does not exist yet — owner/clinical deliverable). `src/chain/prompts.ts` gains the variant text
*verbatim* once approved; the code never paraphrases (CLAUDE.md §2 rule 1).

### 3.2 Orchestrator: route the flag into the generation path instead of holding

In [orchestrator.ts](src/chain/orchestrator.ts), the `MODIFIED_*` actions currently early-return
`held`. New behavior: map the action → `ReportMode` and run the **same** generation + Call 5
loop with that mode. The existing fail-closed contracts are unchanged and apply identically:

- The deterministic banned-term backstop ([banned-terms.ts](src/safety/banned-terms.ts)) still
  runs before Call 5. **AGING adds mode-specific forbidden words** (`anti-aging`, `younger`,
  `reverse`, `erase`, …) — extend the scan with a mode-scoped term list so an AGING report that
  slips an aging-panic word is caught deterministically, not just by the judge.
- Call 5 still gates every variant. The safety filter must additionally verify the mode's
  invariants (ED → no body-composition language present; AGING → no banned aging words). This
  is **prompt work on Call 5** → owner/clinical sign-off. Until then, the deterministic backstop
  is the enforceable floor.
- Regeneration loop, `MAX_REGENERATIONS`, and HARD_FAIL handling are reused as-is.

A new delivered outcome shape carries the mode so fulfillment can pick the right email:

```
{ status: 'delivered'; reportMarkdown: string; filter: FilterResult; mode: ReportMode }
```

### 3.3 Fulfillment plan changes

[plan.ts](src/fulfillment/plan.ts) maps a delivered modified report to its actions:

| Mode | deliverReport | email (NEW kinds) | manualReview | refund |
|------|---------------|-------------------|--------------|--------|
| ED | true | `report_delivery_ed` (warm + ED resources, §2.2 step 17) | **true** (§2.2 step 18) | false |
| MEDICAL | true | `report_delivery` (+ derm-referral already in report body) | true | false |
| AGING | true | `report_delivery` (standard delivery email) | optional | false |

ED requires a **distinct delivery email** (resources framed warmly) → new copy in
`Landing_Copy.md` + a template + an `EmailPayload` kind. MEDICAL/AGING can reuse the existing
`report_delivery` email since their resource/referral content lives inside the report body.

### 3.4 Resource pages

Trust_Safety wants prominent in-report resources. Two pages are needed (static, `noindex`,
served like `api/report/[id].ts`): an **ED-resources** page and a **dermatologist-guidance**
page. Copy is an owner deliverable. ⚠️ §2.2 step 16 flags that NEDA's classic helpline was
discontinued — the **current best ED resource must be verified at launch**, not hard-coded blind.

---

## 4. What must exist before code lands (owner / clinical deliverables)

1. **Prompt variants** in `/docs/Prompt_Chain.md` for Call 4 ED / MEDICAL / AGING modes, plus
   Call 5 verification additions — **signed off by both clinical reviewers** (Trust_Safety §10
   gate items 35–37: second ED-specialist advisor + modified prompt chain).
2. **ED delivery email copy** in `/docs/Landing_Copy.md` (§8 sequence) — warm, resource-forward.
3. **Two resource pages' copy** (ED resources; dermatologist guidance) — with a verified,
   current ED helpline/resource (NEDA caveat above).
4. **AGING banned-word list** confirmed against Trust_Safety §3 (the aging-language row already
   lists: `anti-aging`, `younger-looking`, `erase wrinkles`, `reverse aging`, `fight aging`,
   `age spots`-as-defect, `turkey neck`).

Until #1–#3 exist, the orchestrator should **continue returning `held`** for the affected
flags — do not ship a half-built modified path. M5's code is gated on the copy/prompts, exactly
as the email seams are today.

---

## 5. Suggested build sequence (smallest, safest first)

1. **AGING** — lightest: standard report + tone prompt swap + extend the deterministic banned
   scan with the aging-word list + reuse `report_delivery`. Lands first, lowest risk.
2. **MEDICAL** — modified prompt (basics-only skin + derm referral) + derm resource page. Reuses
   `report_delivery`.
3. **ED** — heaviest: structural section removal, ED resource page, **new** warm delivery email,
   mandatory manual review. Lands last, after the ED-specialist clinical sign-off.

Each step is independently shippable behind its flag and leaves the others `held`.

---

## 6. Testing (CLAUDE.md §6 step 5 — required for anything touching the chain/safety)

- **Orchestrator:** each `FLAG_*` routes to its `ReportMode` and reaches `delivered` (mock Call
  4/5), not `held`. Mode is carried through to the outcome.
- **Deterministic backstop:** an AGING report containing a banned aging word → `hard_fail` even
  if the (mocked) judge would pass it. ED report containing body-composition language → caught.
- **Fulfillment plan:** ED delivered → `report_delivery_ed` email + `manualReview: true`;
  MEDICAL/AGING → `report_delivery`; none refund.
- **Fail-closed preserved:** thrown Call 5 / exhausted regen still `hard_fail` for every mode.
- All AI calls mocked — never hit the real API in tests (CLAUDE.md §6 step 5).

---

## 7. Open questions for the founder

1. **AGING manual review** — Trust_Safety lists manual review for ED explicitly but not AGING.
   Queue AGING reports too, or deliver silently?
2. **ED report without body metrics** — Call 3 scoring may include a body-composition dimension;
   confirm it is *dropped from scoring*, not just hidden in Call 4, so priorities don't reference
   an omitted dimension.
3. **MEDICAL "basics" boundary** — what skin advice counts as "basic" (allowed) vs. "beyond
   basic" (derm referral only)? Needs a clinical line.
4. **Held backlog** — any users already `held` in the review queue when M5 ships: reprocess
   through the new path, or handle manually?

---

*Related: [FOLLOWUPS.md](FOLLOWUPS.md) M5. This design consumes — never invents — the prompts and
copy those deliverables will provide.*
