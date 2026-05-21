**GLOWRANK**

*Your personal AI glow-up coach.*

**Trust, Safety & Tone Guidelines**

*Dual-wedge launch (men + women, makeup included)*

The most important document in this suite

*Status: Working draft — May 2026*

Preamble — Why This Document Exists

Of every document in the GlowRank suite, this one matters most. The business plan can be wrong about market size and the company can still succeed. The PRD can be wrong about a feature and the product still works. But if *this* document is wrong — if the tone is off, if the guardrails fail, if a vulnerable user is harmed — the company dies, and that is the smaller loss compared to the harm done.

**Non-negotiable:** *Two licensed clinical reviewers must sign off before launch — one with men's body image / BDD expertise, one with women's body image / eating disorder expertise. Budget \$600–\$1,500 for these reviews combined. This is the single highest-ROI dollar in the entire plan.*

1\. Core Commitments

These are inviolable across both genders. They override growth metrics, conversion data, and founder preference.

1.  **We will never tell any user they are unattractive.** Not directly. Not implicitly. Not through scores. Not through comparisons. Not through what we leave out.

2.  **We will never recommend cosmetic surgery, injectables, or medical procedures.** This applies equally to men's and women's reports. We refer to licensed medical professionals.

3.  **We will never serve users under 18.** Hard gate.

4.  **We will route users showing signs of harm to professional resources, not to a paid report.** Even at the cost of the sale.

5.  **We will use neutral language about bodies — across all genders, all body types, all ages.** Never "too fat," "too skinny," "too short." Never anti-aging framing of normal skin or hair. Body and aging recommendations are tied to user-stated goals, not aesthetic verdicts.

6.  **We will treat makeup as enhancement, not correction.** Never "contour to fix your jaw," "cover up your nose," or any feature-fixing framing. Makeup recommendations are for occasion, mood, and personal expression — never for hiding perceived defects.

7.  **We will treat photos as private medical records, not marketing assets.** Deleted after 30 days. Never used for training. Never shared without separate explicit consent.

8.  **We will be honest about what we are.** AI-generated style and grooming advice. Not a coach. Not a therapist. Not a doctor.

2\. Vulnerable User Populations

Some users come to GlowRank in a vulnerable state. They deserve more care, not less. The product must identify and respond appropriately. With the women's segment now in scope, eating disorder vulnerability and aging-related distress are added to the populations actively monitored for.

2.1 Body dysmorphic disorder (BDD)

BDD affects both genders. Historically the men's looksmaxxing audience overlaps heavily with BDD vulnerability; women's segment overlaps with appearance-perfectionism and dysmorphia around specific features (nose, skin, body proportions).

BDD signal detection — both genders

- Free-text mentions of being "ugly," "deformed," "hideous," "disgusting," or similar self-directed language.

- References to specific facial features as "wrong" or "defective."

- Multiple uploads of nearly identical photos.

- Stated history of cosmetic procedures with dissatisfaction.

- Mentions of social withdrawal or avoidance "because of how I look."

BDD signals — men's-segment-specific

- Requests for ratings of specific facial measurements, ratios, or canthal tilts (looksmaxxing/incel terminology).

- Mentions of "mewing," "bone smashing," or similar harmful practices.

- References to height as fundamentally limiting (some BDD presentations in men's communities fixate on height).

BDD signals — women's-segment-specific

- Repeated focus on one feature (nose, jaw, skin) framed as defective.

- Requests to be "told the truth" about appearance defects.

- References to "snatched," "buccal fat," or surgical aesthetic terminology in a fixated way.

- Excessive comparison to influencers or celebrities by name.

Response protocol (unchanged)

When 2+ signals are detected:

9.  Pause report generation.

10. Show the user a resource page instead of standard report flow.

11. Refund the payment automatically.

12. Send follow-up email with crisis resources and a kind note.

13. Flag the account email to prevent re-purchase loops.

2.2 Eating disorders — material expansion for women's segment

**Why expanded:** Eating disorders are more prevalent in women's appearance-improvement contexts. The dual-wedge launch must take ED vulnerability as seriously as BDD. This applies in Phase 1; it becomes **critically more so** when wedding-prep expansion begins in Phase 2.

ED signal detection (both genders, but more frequent in women's segment)

- Mentions of restrictive eating, target weights, calorie counting.

- "Need to lose X pounds for \[event/photo/profile\]."

- References to past ED diagnoses presented as current.

- "Tell me how much weight to lose." Direct asks for weight prescription.

- Body comparisons to specific influencers or celebrities.

- Mentions of fasting, cleanses, or extreme exercise regimens tied to appearance goals.

- References to "snatched waist," "flat tummy," or other body-restriction aesthetic terminology in obsessive context.

ED response protocol

**Important distinction from BDD:** With ED, refusing the report entirely can itself feel like rejection and may worsen the situation. Instead, **modify the report:**

14. Generate a report that omits any body composition, weight, or body-shape advice entirely.

15. Strengthen the grooming, wardrobe-fit, photo-skill, and (for women) makeup dimensions to compensate.

16. Include NEDA / National Alliance for Eating Disorders helpline references prominently. (Note: NEDA's classic helpline has been discontinued — verify current best resource at launch.)

17. Send a follow-up email with eating-disorder-specific resources framed warmly.

18. Flag for manual review at next weekly safety review.

2.3 Active mental health crisis

**Signal detection:** Mentions of self-harm, suicide, "can't go on," "want it to end," or similar.

**Response:** Immediate refund. Show crisis resources (988 in US, region-appropriate elsewhere). No report generated. Email sent with caring tone and resource list. Flag for follow-up.

2.4 Aging-related distress (newly added for women's segment)

The women's wedge — returning daters / new chapter — often includes women 35+ whose framing of "I want to feel like myself again" can shade into distress about visible aging. GlowRank must serve these users supportively, not by reinforcing anti-aging panic.

Signal detection

- Repeated mentions of looking "old," "haggard," "past it."

- Direct asks for "younger-looking" outcomes as primary goal.

- References to specific anti-aging procedures in a fixated way.

- Self-comparison to a younger version of self framed as failure.

Response protocol

This is NOT a hard refusal category. Modify the tone and content:

19. Generate the report normally.

20. Reframe skin and grooming recommendations around "looking like a rested, confident version of yourself" rather than "looking younger."

21. Avoid the words "anti-aging," "younger," "reverse," "erase" in the output.

22. Include a short note in the report framing aging neutrally.

2.5 Users under 18

**Hard refusal.** Age intake field gates the form. Stripe payment never completes. Photos are deleted immediately.

2.6 Users displaying gender dysphoria signals

Users questioning or transitioning gender presentation are not a vulnerable population by default — but they need a product that adapts to their stated identity, not one that misgenders or imposes. The intake form explicitly supports non-binary and "prefer not to say" identities.

3\. Prohibited Content

These are hard refusals in every output, regardless of gender or context. Enforced by prompt design AND a second-pass output filter.

3.1 Banned terms — universal

| **Category**                      | **Banned terms (non-exhaustive)**                                                                                                    |
|-----------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| Appearance judgments              | ugly, unattractive, hideous, deformed, asymmetrical, weak features, harsh features, bad bone structure, plain, basic-looking         |
| Body judgments                    | fat, skinny, scrawny, lanky, short, balding (use "thinning hair"), out of shape, frumpy, dowdy                                       |
| Men's-segment terminology         | canthal tilt, mewing, bone smash, hunter eyes, sigma, alpha/beta, mogged, NT, maxilla, looksmax                                      |
| Women's-segment terminology (new) | snatched, buccal fat, hooded eyes (as defect), double chin (as judgment), butterface, mid, mid-tier                                  |
| Aging language (new)              | anti-aging, younger-looking, erase wrinkles, reverse aging, fight aging, age spots (as defect), turkey neck                          |
| Medical claims                    | you have \[acne/rosacea/melasma/condition\], you need \[Accutane/Botox/filler/retinoid prescription\], this looks like \[diagnosis\] |
| Surgical/procedural               | consider \[rhinoplasty/jaw surgery/hair transplant/lipo/lift/any procedure\], get \[injectables/filler/Botox/laser\]                 |
| Makeup-as-correction (new)        | contour to fix, hide your \[feature\], cover up \[feature\], make your nose look smaller, slim your face                             |
| Comparative language              | compared to others, most men/women, you're worse than, below average, more attractive than                                           |
| Race / ethnicity                  | Any commentary on racial features. Skin tone may be referenced neutrally only for makeup undertone matching.                         |

3.2 Topics excluded from recommendations

- Cosmetic surgery, fillers, Botox, threading, hair transplants, lifts of any kind.

- Prescription medications including topical retinoids, oral acne medications, hair loss medications.

- Restrictive diets, calorie targets, intermittent fasting protocols, weight-loss goals expressed as numbers.

- Dating coaching, message rewriting, conversational scripts.

- Anti-aging procedure recommendations of any kind.

- Permanent makeup procedures (microblading, lip blushing, permanent eyeliner) — these are out of scope and adjacent to medical procedures.

- Comparison with other users or named real people.

- Bone structure, facial proportion ratios, skull shape.

4\. Permitted Content — Where We Add Value

4.1 Grooming (both genders)

- Haircut suggestions described by style name, not face-shape claims.

- Beard shaping (men) and brow grooming (both genders).

- Recommendations for finding a good barber/stylist.

- Hair care basics — wash frequency, product type — not specific medical interventions.

4.2 Skin (both genders)

- Basic over-the-counter routine: cleanser, moisturizer, sunscreen. Three-product max for beginners.

- Lifestyle factors: sleep, hydration, sunscreen, gentle cleansing.

- Recommend dermatologist consultation for anything beyond basic.

- No active ingredients beyond universally OTC-safe items. No retinol, no salicylic acid concentration recommendations, no benzoyl peroxide percentages.

4.3 Wardrobe (both genders)

- Fit recommendations ("shirts that taper at the waist," "a dress that nips in just below the bust").

- Color recommendations based on stated style preference.

- Wardrobe gap analysis (categories missing).

- Specific budget-aware shopping suggestions by category, not specific brand obligation in Phase 1.

4.4 Photos & body language

- Lighting, angles, expression, posture cues.

- Background and framing suggestions.

- Genuine smile coaching, presence cues.

4.5 Profile / presentation (if provided)

- Photo selection, photo gaps, presentation themes — variety, consistency, clarity.

4.6 Makeup (new section — women's & non-binary opt-in)

**Scope discipline:** Makeup is the newest dimension and the easiest to slide into harm. The boundaries below are strict.

What we recommend

- **Everyday looks.** Tinted moisturizer, simple eye, soft lip — described by mood and occasion, not feature-fixing.

- **Occasion looks.** "For a dinner date" or "for a confident workday" — situational, not corrective.

- **Product category gaps.** "You don't appear to have a daily-wear blush; here's why one would help your everyday look feel polished."

- **Undertone guidance.** Cool / warm / neutral — neutral framing only, useful for foundation and lip color matching. Never tied to ethnicity commentary.

- **Technique pointers (light only).** "Try a slightly thicker line on your upper lash" or "a soft wash of color rather than a defined crease." Light coaching, not full tutorial.

What we never recommend

- Contouring to "fix" a feature (jaw, nose, forehead).

- "Slimming" any part of the face.

- "Lifting" effects through makeup application.

- Permanent makeup procedures.

- Lash extensions, brow microblading, semi-permanent applications.

- Heavy concealer recommendations to hide perceived features.

- "Looking younger" makeup advice.

The makeup tone rule

*Every makeup recommendation must answer: "Is this making the user feel more like themselves, or making them try to look like someone else?" The first is allowed. The second is not. If a recommendation requires the user to "hide" or "fix" a feature to achieve the look, it's the second.*

5\. Tone & Language Patterns

5.1 The reframing principle

Every observation must be reframed from a deficit statement into an opportunity statement. This applies equally to men's and women's reports.

| **Never write**                  | **Write instead**                                                                                   |
|----------------------------------|-----------------------------------------------------------------------------------------------------|
| "Your skin looks bad."           | "Skin is your highest-impact area. A simple 3-step routine for 30 days will show visible change."   |
| "Your haircut doesn't suit you." | "A small change to your current style would feel sharper — here's a specific direction."            |
| "You scored 4/10 on photos."     | "Photos are where you have the most room to improve fast. Better lighting alone is a major unlock." |
| "Your makeup is too heavy."      | "A lighter approach to base would let the rest of your look feel more current and intentional."     |
| "Your nose looks big."           | \[REFUSED. Never written. Hard fail.\]                                                              |
| "You look older than your age."  | "There's a refreshed, well-rested version of your current style waiting just a few tweaks away."    |
| "Your wardrobe is dated."        | "Two or three updated pieces would carry your existing wardrobe into a sharper register."           |
| "You're not photogenic."         | "Photogenic isn't a fixed trait — it's a learned skill. Here are 3 specific techniques."            |

5.2 The specificity principle

Every section of every report must include at least one observation that could not have been generated without seeing the user's actual photos. This applies to makeup too — "a softer line on your lower lashes given the shape of your eyes" is specific; "try a softer eye look" is generic.

5.3 The agency principle

Every recommendation must be paired with an alternative or softer version. We are advisors, not prescribers.

5.4 The motivation principle

Every report ends on a forward-looking note. Required closing structure: (1) Acknowledge the effort of seeking feedback. (2) Highlight one specific strength visible in the photos. (3) State the top priority clearly. (4) Express confidence in the user's ability to execute.

6\. Output Filter — Technical Implementation

Every generated report must pass through an automated second-pass filter before delivery.

6.1 Filter checks

23. **Banned-term scan.** Now includes universal terms plus gender-specific and makeup-specific banned vocabulary from Section 3.1.

24. **Tone audit.** AI judge scores: warmth, specificity, agency, motivation. All must be ≥7.

25. **Required-element check.** All required disclaimers present. Closing structure matches Section 5.4.

26. **Medical-claim check.** AI judge reviewing for diagnosis, medication recommendations, or procedural recommendations.

27. **Makeup-specific check (new).** AI judge specifically reviewing makeup sections for feature-fixing language, contouring-as-correction framing, or any "hide" / "slim" / "reduce appearance of" phrasing.

28. **Safety-flag re-check.** Re-scan free-text intake for signals missed initially.

6.2 Filter outcomes

- **Pass:** Report delivered.

- **Soft fail (1–2 issues):** Regenerate with corrective instructions. Maximum 2 retries.

- **Hard fail:** Refund automatically. Manual review queue.

6.3 Audit trail

Every report logged with: prompt version, model version, filter scores, retry count, segment (gender). Logs retained 90 days for quality review.

7\. Incident Response

7.1 What counts as an incident

- A user reports being upset or harmed by report content.

- A report passes filter but contains banned content.

- A vulnerable user receives a standard report despite signals being present.

- A user under 18 receives a paid report.

- A photo is leaked, accessed inappropriately, or retained past TTL.

- A report contains medically dangerous advice.

- **New:** A makeup recommendation contains feature-fixing or "hide" framing that passed the filter.

- **New:** A user with ED signals receives an unmodified report with body composition language.

7.2 Response protocol

29. **Pause all ad spend within 1 hour.** Non-negotiable.

30. **Acknowledge to the user within 4 hours** with a personal email — no template. Offer refund regardless of original policy.

31. **Root-cause analysis within 48 hours.** Which prompt failed? Which filter check missed? Which user signal was ignored? Was the gender-specific path correctly invoked?

32. **Fix deployed and tested before unpausing spend.**

33. **Document in incident log.** Track patterns by segment.

7.3 Public communication

- Acknowledge fully. No denials.

- Apologize without qualification.

- State the specific fix.

- Offer remediation.

- Don't blame the AI. We chose the AI. We're responsible.

8\. Resource Pages & Referrals

8.1 BDD resource page

Links to International OCD Foundation BDD page, BDD Foundation (UK), Psychology Today therapist directory, crisis lines.

8.2 Crisis resource page

988 Suicide & Crisis Lifeline (US), Crisis Text Line, region-appropriate equivalents.

8.3 Eating disorder resource page — expanded

**Headline:** "You deserve support, not just style advice."

**Resources:** National Alliance for Eating Disorders helpline (verify current best resource at launch; NEDA's classic helpline has been discontinued), Project HEAL, ANAD (Anorexia Nervosa and Associated Disorders), region-appropriate international equivalents.

8.4 Verifying resources

*Resource phone numbers and URLs must be verified at launch and re-verified quarterly. Outdated crisis resources are worse than no resources.*

9\. Marketing & Ad Creative Guidelines

The tone discipline of the product extends to every ad, every landing-page headline, every TikTok caption.

9.1 Allowed creative angles (both genders)

- Transformation curiosity ("What would my glow-up plan look like?").

- Specificity hooks ("AI told me the 3 things to focus on first.").

- Practical framing ("\$10 vs. a \$300 stylist consultation").

- Aspirational, never deficit-based.

9.2 Banned creative angles (both genders)

- "Why aren't you getting matches?"

- "Stop being ugly."

- "Your face is holding you back."

- Before/after framings where the "before" is shameful.

- Ratings of celebrities or real people.

9.3 Women's-segment-specific banned angles (new)

- "Look 10 years younger."

- "Get back your pre-baby body."

- "Hide your \[feature\]."

- Anti-aging panic framing.

- "Before/after" weight transformation framing (already banned by TikTok and Meta policy, but worth restating).

- "What men want" framing of any kind.

9.4 Required elements in ad creative

- The product positioning as a coach, not a rater.

- The \$9.99 price (pre-qualifies click-throughs).

- Visible compliance with platform policies.

10\. Ongoing Review & Governance

10.1 Weekly safety review

Every Friday, the founder reviews:

- Every refund request and stated reason — segmented by gender.

- Every NPS comment below 5.

- Random sample of 10 generated reports for tone audit (5 men's, 5 women's).

- Filter logs — what was rejected and why.

10.2 Quarterly clinical review

Every quarter, BOTH retained clinical advisors review:

- Sample of 30 reports from prior quarter (15 each gender).

- Updated prompt versions.

- Incident log.

- Resource page accuracy.

- Updated safety literature.

10.3 Annual external audit

Once revenue exists: annual external review by clinical psychologist + privacy lawyer. Document and publish summary.

10.4 Document versioning

Every change is logged with date, author, and rationale. Both clinical advisors sign off on every change before it takes effect.

11\. Wedding-Prep Expansion — Readiness Gate

Wedding-prep is the highest-AOV expansion segment AND the highest-safety-risk segment. This section documents the gate that must be passed before this segment can be served.

11.1 Why this segment is gated

- Eating disorder vulnerability is materially higher in wedding-prep contexts than in any other segment.

- "Lose weight for the wedding" culture is documented, harmful, and pervasive.

- Failure is more visible than in other segments — wedding press, bridal subreddits, tight communities.

- Marketing creative is unusually difficult to produce without triggering weight or appearance insecurity.

11.2 Required gates before launch

34. **Updated Safety Doc v3.0** with wedding-prep-specific tone rules, ED detection improvements, and creative restrictions.

35. **Second clinical advisor specifically retained** with eating disorder clinical expertise (registered dietitian-nutritionist with ED specialty OR psychologist specializing in ED).

36. **Wedding-prep ad creative reviewed by the ED specialist** before any spend.

37. **Modified prompt chain** with strict refusal of any body-composition, weight-loss, or pre-wedding-shrink framing.

38. **Dedicated wedding-prep landing page** with frontloaded "this is a styling and grooming product, not a weight loss product" framing.

39. **Mandatory disclaimer in every wedding-prep report:** "GlowRank does not give weight loss, diet, or body modification advice for weddings or any event."

40. **Founder commitment:** First 100 wedding-prep customers' reports manually reviewed in addition to automated filter.

11.3 Decision authority

The wedding-prep launch is a one-way door. The decision to launch this segment cannot be reversed without significant brand damage. Therefore the launch decision requires:

- Explicit founder sign-off.

- Written sign-off from both clinical advisors.

- Documented review by a lawyer of all wedding-prep-specific marketing claims.

—

*The dual-wedge expansion doubles the safety surface area of this product. The work doubled with it. Read this document twice. Make sure both clinical advisors have read it. Then build the product. Then read it again before launching.*

**END OF SAFETY DOCUMENT**
