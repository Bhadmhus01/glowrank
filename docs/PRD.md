**GLOWRANK**

*Your personal AI glow-up coach.*

**Product Requirements Document**

*Phase 1 MVP, dual-gender concierge*

PRD

*Status: Working draft — May 2026*

1\. Overview

1.1 Purpose of this document

This PRD specifies what the GlowRank Phase 1 MVP must do from the user's first touchpoint to delivery of their paid report, across both primary audiences (men and women). It is the contract between product intent and execution. If a feature is not in this document, it is not in scope for Phase 1.

*Scope discipline: This document deliberately excludes mobile apps, user accounts, photo re-scoring, subscription billing, and affiliate integration. Wedding-prep segment is explicitly NOT in Phase 1 scope.*

1.2 Phase 1 goal (one sentence)

*"Prove that strangers across both genders will pay \$9.99 for an AI-generated glow-up report delivered from a one-page website, with quality high enough to produce \>40 NPS and \<10% refund rate in both segments."*

1.3 Success criteria

- **Primary:** 100 paid customers across both genders within 10 weeks of launch.

- **Per-segment:** At least 30 paid customers in each gender (whichever ratio the funnel produces, but both must be live).

- **Quality:** Net Promoter Score \>30 in BOTH segments.

- **Trust:** Refund rate below 10% in BOTH segments. Zero safety incidents.

- **Economics:** Cost per acquired paid customer below \$10 blended on paid social.

1.4 Out of scope for Phase 1

- Mobile native apps.

- User accounts, login, password management.

- Photo storage beyond report generation window.

- Subscription billing.

- Affiliate link tracking.

- Wedding-prep segment (deferred to Phase 2 behind safety gate).

- Makeup tutorials with step-by-step technique (Phase 1 only does light coaching, not full tutorials).

- Social features.

- Localization (English only).

- Real-time chat (email only).

2\. Target Users — Dual Primary Persona

2.1 Persona A — Daniel, 26, Houston (men's wedge)

- **Profile:** Single, employed in tech support or sales, earns \$50–\$75K, lives alone or with a roommate.

- **Dating context:** Active on Hinge and Bumble. 1–3 matches per week. Conversations stall. Suspects photos/style are working against him.

- **Self-image:** Not unhappy, but feels he could present better. Watched looksmaxxing content, finds some useful and some upsetting.

- **Spending:** Has paid for AI headshot apps. Will impulse-buy \$9.99. Skeptical of subscriptions.

- **Finds us through:** TikTok ad with before/after hook, or a friend forwards the link.

- **Afraid of:** Being told he looks bad. Wasting \$10. Being mocked.

2.2 Persona B — Maya, 36, Atlanta (women's wedge)

- **Profile:** Recently divorced (18 months out) or extended single period after a long relationship. Marketing manager, earns \$75–\$120K. Has a teenager or no kids; either way, more time for herself than in years.

- **Trigger:** Beginning to return to dating, OR just starting a new chapter (new job, new city, kids in school, just feeling ready). "I want to feel like myself again — or maybe a better version of myself."

- **Self-image:** Not in crisis, but conscious that her wardrobe and self-care routines have drifted during the past few years. Sees women her age looking great on Instagram and wonders what they know.

- **Spending:** Has spent on stylists, dermatology consultations, or beauty subscriptions before. \$49 premium audit is plausible from day 1. Skeptical of subscriptions on principle.

- **Finds us through:** Instagram ad, Pinterest, a substack writer's recommendation, or a friend in her group chat.

- **Afraid of:** Looking like she's trying too hard. Anti-aging panic creep. Being condescended to. Being told she needs to look younger.

2.3 What both personas need in 90 seconds

1.  Feel that the AI actually looked at their photos — not generic advice.

2.  Understand what to fix first, not a 30-item list.

3.  Get specific, affordable, occasion-appropriate recommendations.

4.  Walk away feeling motivated, not insulted.

2.4 Anti-personas (we do NOT optimize for)

- Users showing signs of body dysmorphia.

- Users showing signs of eating disorders.

- Users under 18.

- Users seeking medical, dermatological, or surgical advice.

- Wedding-prep users (in Phase 1 — directed to a waitlist with kind framing).

- Users seeking dating profile rewrites or message coaching.

3\. End-to-End User Flow

3.1 Flow diagram

\[Ad / Referral\]

↓

\[Landing Page\] — gender-adaptive hero copy

↓

\[CTA: "Get my glow-up plan — \$9.99"\]

↓

\[Intake Form\] — adaptive logic for gender + makeup opt-in

↓

\[Stripe Checkout\] — \$9.99 one-time

↓

\[Processing Screen\] — "Your plan is being built (60–90s)..."

↓

\[Report Delivery\] — on-screen + emailed PDF

↓

\[Post-Report Upsell\] — "Want the \$49 Premium Audit?"

↓

\[Email Follow-up\] — Day 3 / 14 / 30

3.2 Step-by-step requirements

Step 1 — Landing page (gender-adaptive)

The landing page detects nothing automatically. It presents a primary headline that works for both audiences, with a single "who is this for" toggle near the fold that lets users see imagery and testimonials relevant to them. Conversion data per segment is tracked but the page does not gate behavior on gender.

- **Primary headline (cross-gender):** "Find out exactly what would help you feel more confident in your own skin."

- **Sub-headline:** "AI looks at your photos, builds your personalized glow-up plan in under 2 minutes. \$9.99."

- **Visual:** Carousel showing 2–3 sample report previews — one men's, one women's, one neutral. Anonymized.

- **Below the fold:** 3-step explainer, tone guarantee, FAQ.

- **Mobile-first:** \>70% mobile traffic.

Step 2 — Intake form (adaptive)

The intake form gathers information needed by the prompt chain. Conditional logic activates makeup questions when the user identifies as woman or non-binary AND opts in to makeup.

| **Field**                          | **Type**          | **Notes**                                                                                                |
|------------------------------------|-------------------|----------------------------------------------------------------------------------------------------------|
| Age                                | Number            | Reject if \<18. Hard gate.                                                                               |
| Gender presentation                | Single-select     | Man / Woman / Non-binary / Prefer not to say                                                             |
| Primary goal                       | Single-select     | Dating / Career / Specific event / New chapter / General confidence                                      |
| Budget tier                        | Single-select     | Under \$100 / \$100–\$300 / \$300–\$1000 / \$1000+                                                       |
| Height                             | Number + unit     | Used for proportional wardrobe advice                                                                    |
| Body type (self-described)         | Single-select     | Slim / Athletic / Average / Broader / Larger / Prefer not to say — neutral language                      |
| Style preference                   | Multi-select      | Casual / Smart-casual / Formal / Streetwear / Minimalist / Classic / Trend-forward / Open to suggestions |
| Wardrobe vibe (women / NB)         | Single-select     | Polished / Effortless / Bold / Soft / Eclectic / Open                                                    |
| Makeup interest (conditional)      | Single-select     | Shown only if gender ≠ man. "Yes, want makeup tips" / "Just light pointers" / "No, skip makeup"          |
| Skin undertone (conditional)       | Single-select     | Shown only if makeup opt-in. Cool / Warm / Neutral / Not sure                                            |
| Current makeup level (conditional) | Single-select     | Shown only if makeup opt-in. Daily full / Daily light / Occasional / Beginner / Don't know yet           |
| Front-facing selfie                | Photo upload      | Required. Neutral lighting requested.                                                                    |
| Side profile photo                 | Photo upload      | Required.                                                                                                |
| Full body photo                    | Photo upload      | Required.                                                                                                |
| Wardrobe photos                    | Photo upload (≤5) | Optional.                                                                                                |
| Dating profile screenshot          | Photo upload (≤3) | Optional.                                                                                                |
| Makeup look photos (conditional)   | Photo upload (≤3) | Optional. Shown only if makeup opt-in.                                                                   |
| Anything we should know?           | Free text         | Optional. Scanned for safety signals.                                                                    |
| Email                              | Email             | Required for delivery.                                                                                   |

**Critical:** *Form must take under 4 minutes on mobile, even with all conditional fields activated. If makeup module adds more than 60 seconds of intake time, simplify it.*

Step 3 — Checkout

- **Stripe Checkout hosted.** Apple Pay + Google Pay.

- **Pricing:** \$9.99 one-time. No subscription. No upsell during checkout.

- **Refund policy:** "Not happy? Email within 7 days, full refund, no questions."

Step 4 — Processing screen

- Animated indicator with rotating status messages, including tone reassurance card during wait.

- Max 120 seconds. Status messages vary slightly by gender (women's reports take longer when makeup module is active).

Step 5 — Report delivery

- Report appears on-screen as scrollable web page.

- PDF emailed simultaneously.

- Unique shareable URL.

Step 6 — Post-report upsell

- **Single upsell:** "Want the Premium Audit? \$49." Content of premium tier varies slightly by gender (women's includes deeper makeup section; men's includes deeper photo coaching).

- No popups, no urgency timers.

Step 7 — Email follow-up

- Day 0: Report delivery.

- Day 3: NPS check-in.

- Day 14: Progress check.

- Day 30: Transformation invite + share permission ask.

4\. The Report — Product Core

4.1 Report structure

Every report contains the following sections, in order. Makeup section appears only for users who opted in. Profile section appears only when dating screenshots were uploaded.

5.  **Personal intro paragraph** (warm, specific to user's photos)

6.  **Your top 3 priorities** (THE killer feature)

7.  **"What's Holding You Back" scorecard** (6 or 7 dimensions)

8.  **Detailed recommendations** (one section per dimension)

9.  **Your 30-day glow-up plan** (week-by-week)

10. **Shopping list** (under budget, with price ranges)

11. **Closing motivation**

4.2 The 6+1 dimension scorecard

| **Dimension**          | **Always shown?** | **What it measures**                                                                          |
|------------------------|-------------------|-----------------------------------------------------------------------------------------------|
| Grooming               | Yes               | Haircut, beard, brows — fit and freshness                                                     |
| Skin                   | Yes               | Visible condition, routine quality from intake                                                |
| Wardrobe               | Yes               | Fit, style coherence, occasion-appropriateness                                                |
| Photos                 | Yes               | Lighting, angles, expression, framing                                                         |
| Body language          | Yes               | Posture, expression, visible confidence                                                       |
| Profile / presentation | Conditional       | Only if dating screenshots provided                                                           |
| Makeup                 | Conditional       | Only if user opts in during intake. Everyday + occasion looks, product gaps, light technique. |

**Tone rule:** *Never show a single composite score. Never say "you scored low." Always frame as "highest opportunity" or "already strong."*

4.3 Recommendation requirements

Each recommendation must:

- **Be specific.**

- **Be affordable per stated budget.**

- **Be actionable in \<30 days.**

- **Include a price range.**

- **Acknowledge alternatives.**

4.4 Makeup section requirements (new)

**Cross-reference:** Trust & Safety Section 4.6 for permitted/prohibited content. The makeup section is the easiest to slide into harm; do not paraphrase the safety rules — implement them literally.

- Maximum 4 recommendations in the makeup section.

- Always includes one "everyday" recommendation, one "occasion" recommendation.

- Product suggestions reference category + price range only in Phase 1, no specific brand affiliate links yet.

- Never references contouring as feature-fixing.

- Never recommends procedures (lash extensions, microblading, etc.).

- Closes with: "Makeup is here to help you feel like yourself on a great day — not to hide anything."

4.5 Report length

- Men's report (no makeup): 1,500–2,300 words.

- Women's report with makeup: 2,000–2,800 words.

- Reading level: 8th-grade conversational.

5\. Technical Requirements

5.1 Stack (Phase 1)

| **Component** | **Recommended choice**              | **Why**                                                     |
|---------------|-------------------------------------|-------------------------------------------------------------|
| Landing page  | Framer or Webflow                   | Designer-led; gender-adaptive copy via conditional sections |
| Intake form   | Typeform or Tally                   | Conditional logic critical for makeup opt-in path           |
| Payments      | Stripe Checkout                     | Apple Pay + Google Pay                                      |
| Backend       | Make.com / Zapier + Vercel function | No backend infra                                            |
| AI generation | Claude (Anthropic) primary          | Vision required; women's reports use makeup module          |
| PDF rendering | Puppeteer or PDFShift               |                                                             |
| Email         | Resend or Postmark                  |                                                             |
| Analytics     | Plausible or Posthog                | Privacy-friendly; segment by gender                         |
| Photo storage | R2 or S3, 30-day TTL                |                                                             |

5.2 AI model selection

- **Primary:** Claude Sonnet (multimodal).

- **Cost target:** Under \$1.20/report men's, under \$1.80/report women's-with-makeup, at 80%+ gross margin.

- **Latency target:** Under 90 seconds 95th percentile.

5.3 Photo handling

- JPG/PNG/HEIC formats. 10MB/photo, max 12 photos.

- 30-day TTL automated deletion.

- EXIF stripping on upload.

- Photos never used for training. Stated clearly in Privacy + ToS.

5.4 Performance & reliability

- Lighthouse mobile \>95.

- Report generation success rate \>98%.

- \>99% uptime during ad hours.

6\. Content Requirements

6.1 Brand voice

- **Warm, not cheerful.**

- **Specific, not generic.**

- **Forward-looking.**

- **Confident, not preachy.**

- **Gender-aware but not gender-pandering.** Don't write differently because the user is a woman; write differently because the user has different goals.

6.2 What the report should never say

Hard refusals, enforced by prompt design and post-generation filter. See Trust & Safety Section 3.1 for complete list. Highlights:

- Any appearance-judgment language.

- Any body-judgment language.

- Any looksmaxxing OR women's-segment terminology of judgment.

- Any anti-aging panic framing.

- Any medical claims or procedural recommendations.

- Any makeup-as-correction framing.

6.3 Required disclaimers (all reports)

- **Top:** "This is AI-generated style and grooming advice, not medical, dermatological, or psychological guidance."

- **Skin section:** "For any skin concerns lasting more than 6 weeks, please consult a licensed dermatologist."

- **Makeup section (if present):** "Makeup is here to help you feel like yourself — not to hide anything."

- **Bottom:** "Your worth as a person is not measured by any score in this report. This is a tool, not a verdict."

7\. Safety Requirements

**Full implementation:** *Trust, Safety & Tone Guidelines.* This section is the minimum that ships in Phase 1.

7.1 Hard gates

- **Age verification:** \<18 refused. Payment never processes. Photos deleted immediately.

- **Mental health flagging:** BDD + ED + crisis signals scanned via prompt chain Call 1.

- **Refusal patterns:** Photos depicting minors, medical conditions, or non-consensual imagery trigger automatic refusal.

7.2 Required output filtering

Second-pass filter checks all banned phrases (gender-universal + makeup-specific + aging-panic), tone scores, medical claims, and required disclaimers. See Prompt Chain doc Call 5.

7.3 Incident definition

- User reports being harmed or upset.

- Report violates banned content list.

- Under-18 served paid report.

- User with safety signals served standard report.

- **New:** Makeup section contains feature-fixing language that passed filter.

- **New:** ED-flagged user served unmodified body composition content.

**Target:** zero incidents in Phase 1. Any incident triggers immediate launch pause.

8\. Legal & Compliance Requirements

**Full detail:** *Legal & Compliance Checklist.*

8.1 Required pages

- Terms of Service.

- Privacy Policy.

- Photo Consent.

- Refund Policy.

- AI Disclosure.

- Contact email.

8.2 Required consents

- Age verification.

- Photo use consent.

- Marketing consent (separate, optional).

9\. Metrics & Instrumentation

9.1 Funnel events (all segmented by gender)

| **Event**        | **Trigger**               | **Why we care**                                                 |
|------------------|---------------------------|-----------------------------------------------------------------|
| landing_visit    | Page load                 | Top of funnel — track gender source if known                    |
| cta_clicked      | Primary CTA               | Hook effectiveness                                              |
| intake_started   | First field touched       | Intent signal                                                   |
| gender_selected  | Gender field set          | First segmentation point                                        |
| makeup_optin     | Makeup opt-in (yes/no)    | Activation rate of makeup module                                |
| photos_uploaded  | All required photos in    | Highest pre-payment intent                                      |
| checkout_started | Stripe loaded             | Payment intent                                                  |
| payment_success  | Stripe confirmed          | PRIMARY conversion                                              |
| report_delivered | Report URL viewed         | Quality gate                                                    |
| upsell_shown     | Post-report upsell loaded | Secondary opportunity                                           |
| upsell_purchased | Premium paid              | Secondary conversion (track per gender — women expected higher) |
| nps_submitted    | NPS submission            | Quality measure                                                 |
| refund_requested | Refund email              | Quality failure                                                 |

9.2 Reporting cadence

- **Daily:** Ad spend, paid conversions, refunds — segmented by gender.

- **Weekly:** Full funnel review per segment. Compare and adjust.

- **End of Phase 1:** Full retrospective per segment.

10\. Release Plan

10.1 Pre-launch checklist

- Landing page live with gender-adaptive sections.

- Stripe verified.

- Prompt chain tested against 30 internal users (15 each gender, with makeup module active for at least 10 women's tests).

- BOTH clinical reviewers signed off on sample reports — one men's-focused review, one women's-focused review.

- Legal pages reviewed.

- Refund flow tested.

- Analytics events firing per segment.

- Email deliverability tested.

- Photo deletion tested.

10.2 Soft launch

- First 24h: \$100 ad spend cap, split across both segments.

- First 7 days: \$100/day cap. Every 5th report manually reviewed.

- Day 8+: Scale based on per-segment data.

10.3 Hard stop criteria

- Refund rate \>15% in any 48-hour window in either segment.

- Any safety incident.

- NPS drops below 0 in either segment.

- Stripe disputes \>1%.

11\. Open Questions

- **Per-segment pricing.** Should women's segment test \$14.99 entry given higher AOV tolerance? Test week 6.

- **Makeup activation rate.** What % of eligible users opt in? Decision: if \<30%, makeup module is added overhead without ROI — simplify.

- **Wedding-prep waitlist.** Do we collect emails from users who self-identify as wedding-prep, and message them when Phase 2 launches?

- **Gender split.** Does the funnel converge on 50/50, 70/30, or another split? Implications for Phase 2 creative resource allocation.

- **Premium tier per gender.** Should premium audit content be substantially different per gender, or is it the same product with optional sections?

—

*The dual-wedge approach doubles the persona surface and adds the makeup dimension. The discipline that matters is still scope: if a feature isn't in this PRD, it's not in Phase 1. The dual-wedge approach succeeds only if the founder is ruthless about not letting either segment expand beyond what's specified here.*

**END OF PRD**
