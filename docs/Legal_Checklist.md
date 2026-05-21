**GLOWRANK**

*Your personal AI glow-up coach.*

**Legal & Compliance Checklist**

*Pre-launch legal foundation — dual-wedge consumer AI product*

Legal

*Status: Working draft — May 2026*

Important Disclaimer

**This document is not legal advice.** *It is a checklist of areas a lawyer should review with the founder before launch. Every founder should retain a qualified attorney in their jurisdiction for a 1–2 hour consultation. Budget \$400–\$1,500 for this — among the highest-ROI early spends.*

Legal requirements vary by jurisdiction, change over time, and depend on specifics this document cannot anticipate. The areas covered here are the ones most consumer AI startups in the US/UK/EU need to address — but "most" is not "all," and "need to address" is not "how to address." That is the lawyer's job.

1\. Business Formation

1.1 Entity type

- **US-based founder:** LLC is sufficient for Phase 1. Delaware C-Corp only when fundraising is imminent.

- **International:** Local entity, or Stripe Atlas / Delaware C-Corp if planning US fundraising.

- **Phase 1 default:** Fastest and cheapest in the founder's jurisdiction. Re-organize when revenue justifies the complexity.

1.2 Bank account & payment processing

- Business bank account in the entity's name.

- Stripe account verified and connected.

- Tax ID (EIN in US) obtained before opening account.

- Bookkeeping software (Xero, QuickBooks, Wave) configured from day 1.

1.3 Insurance

- **Cyber / data breach insurance:** More relevant given photo handling. Consult a broker once handling 100+ paying users.

- **Professional liability / E&O:** Worth exploring — covers claims about AI output quality or accuracy. Premiums for early-stage consumer AI products are reportedly available but evolving. \[Low confidence — verify with a broker.\]

2\. Required User-Facing Documents

These must be published and linked on the landing pages (both variants) before launch.

2.1 Terms of Service

**Must cover (at minimum):**

- Description of the service (AI-generated style, grooming, skincare, and makeup advice).

- Age requirement (18+).

- Acceptable use rules.

- Limitation of liability — explicit disclaimer that GlowRank is not medical, dermatological, cosmetic, or psychological advice.

- Refund policy reference and link.

- Intellectual property terms.

- Dispute resolution clause.

- Governing law clause.

- Right to modify terms (with notice).

- Termination conditions.

2.2 Privacy Policy

**Must cover (at minimum):**

- What data is collected (photos, intake responses including skin tone and undertone, payment, email, IP).

- How data is used (report generation, customer support, marketing if consented).

- Retention: photos 30 days, intake/email indefinitely unless deletion requested, payment handled by Stripe.

- Third-party processors: Stripe, AI provider, email vendor, analytics.

- User rights (GDPR, CCPA).

- Cookie disclosure.

- Children's privacy statement.

- Contact for privacy requests.

2.3 Refund Policy

- Full refund within 7 days, no questions asked.

- Simple process: reply to delivery email.

- Refund timeline: 5–10 business days.

2.4 Photo Consent

Critical because photos are uniquely sensitive.

- What photos are used for (sole purpose: generating the user's GlowRank report).

- Where photos are stored.

- How long retained (30 days, then automated deletion).

- Who can access them.

- Explicit statement: photos not used to train AI models.

- User's right to request earlier deletion.

- Marketing use is a separate, optional, explicit consent.

2.5 AI Disclosure

- Disclose prominently that recommendations are AI-generated.

- Explain outputs may not be reviewed by a human in normal operation.

- Note human review may occur in flagged cases.

- Provide user-facing contact for questions about AI decision-making.

3\. Photo Handling — Special Legal Attention

3.1 Biometric privacy laws

- **Illinois (BIPA):** Significant litigation history against companies handling facial data. Consult lawyer if serving Illinois users.

- **Texas, Washington:** Have biometric privacy statutes.

- **EU (GDPR):** Facial images are special-category data. Requires explicit consent and lawful basis.

- **California (CCPA/CPRA):** Photos and biometric data covered.

3.2 Practical rules

- Photos deleted from all systems after 30 days — automated, logged, auditable.

- Photos never used for model training.

- Photos never shared with third parties beyond the AI processor.

- EXIF data stripped on upload.

- Photos encrypted at rest.

- Access logs maintained.

3.3 Geographic restrictions

- **Phase 1 launch:** US, Canada, UK, Australia.

- **Defer:** EU until GDPR-aware legal review is complete.

- **Defer:** Illinois until BIPA risk is assessed.

- **Defer:** Strict data localization jurisdictions.

4\. Makeup Recommendations — Legal Surface

Adding makeup as a recommendation dimension expands the product's legal surface area in three specific ways.

4.1 Skin tone and undertone advice

- **Risk:** Recommendations based on skin tone touch on protected characteristics. Bad advice (or advice that systematically underperforms for certain skin tones) can produce real consumer harm and reputational damage.

- **Mitigation:** Prompt chain explicitly tested across the full skin-tone range during pre-launch QA. Clinical advisor (women's-side) reviews sample reports from diverse skin tones before sign-off. Disclaimer in report: "If our recommendation doesn't suit your specific skin, we'll refund."

- **Avoid:** Outdated "warm/cool season" framework as the sole basis for recommendations. It is contested and often biased. If used, used as one input among many.

4.2 Product recommendations (when affiliate launches in Phase 2)

- **Risk:** Recommending a specific product that causes an allergic reaction or skin irritation creates potential product liability exposure.

- **Mitigation (Phase 1, no affiliate):** Recommend product categories and price ranges, not specific SKUs. "A lightweight tinted moisturizer in your shade range, \$20–\$40" — not "buy X brand Y product."

- **Mitigation (Phase 2, with affiliate):** Recommend products with broad compatibility (e.g., established brands with patch-test guidance). Add a "patch test before full use" reminder to all skincare and makeup product recommendations.

4.3 No medical or cosmetic procedure recommendations

- No recommendations for cosmetic procedures (Botox, fillers, threading, microneedling, lash extensions involving adhesives that may irritate, etc.).

- Makeup recommendations stay strictly in the "products applied at home" domain.

- **Specific bans in makeup recommendations:** No "correct your face shape" framing. No "hide your features" framing. No advice on cosmetic dentistry, lash perming, hair removal procedures, or anything requiring a licensed professional.

5\. AI-Specific Legal Considerations

5.1 Output liability

Mitigations:

- Prominent disclaimers (now covering makeup too).

- Conservative recommendations (now covering makeup category-level, not SKU-level, in Phase 1).

- No medical claims.

- Professional consultation suggested for skin/health concerns.

5.2 Training data and IP

- Third-party AI APIs (Anthropic, OpenAI) — read their training-data terms carefully.

- Both providers' enterprise/API defaults are non-training — verify.

- Monitor provider term changes.

5.3 EU AI Act (deferred)

*\[Medium confidence — interpretive guidance evolving through 2026–2027. Verify at launch.\]*

- Likely not high-risk classification.

- Transparency requirements may apply (already complying via AI Disclosure).

- If serving EU users, engage EU-qualified counsel before launch.

6\. Advertising & Marketing Compliance

6.1 Truth in advertising

- Don't claim results that aren't typical.

- Before/after content requires consent from depicted user (in writing).

- Testimonials must be genuine.

- Comparative claims must be substantiable.

6.2 Platform-specific rules (per track)

- **TikTok (both tracks):** Cannot use "before/after" framing for body or appearance in negative-self-image contexts. Cannot target minors. Cannot use body-shaming.

- **Meta / Instagram (both tracks):** Similar restrictions. Personal attributes targeting (sexual orientation, race, religion) is restricted.

- **Pinterest (women's track):** Health & beauty content has its own ad policies — review Pinterest's specific guidelines on weight loss, skincare claims, and anti-aging language before launching ads.

6.3 Gendered marketing risk

- **Dual-wedge risk:** Running two gender-targeted ad tracks creates a higher surface area for claims of stereotyping, exclusion, or differential treatment.

- **Mitigation:** Variant landing pages must accept all genders for purchase (variant routing is a marketing tactic, not a service gate). Both variants link to the unified intake form, which serves everyone. The product itself is not gated by gender — only the marketing surface is.

- **Documentation:** Lawyer should confirm that gender-targeted advertising of the same underlying service is acceptable in the founder's jurisdiction.

6.4 Affiliate disclosure (Phase 2 forward)

- **US (FTC):** Affiliate relationships disclosed clearly and conspicuously. "We may earn a commission if you buy through these links."

- **Placement:** Disclosure before the recommendation, not buried in footer.

- **Influencer affiliate partners:** Same rules apply.

6.5 Email marketing

- **CAN-SPAM (US):** Unsubscribe link, physical address, accurate sender info.

- **GDPR / PECR (EU/UK):** Marketing emails require explicit opt-in.

- **CASL (Canada):** Express consent required.

7\. Consent Language — Gender Neutrality

The shift to dual-wedge requires explicit attention to gender-neutral consent and privacy language.

7.1 Forms must use gender-neutral defaults

- Pronouns: avoid "he/she" — use "they" or restructure.

- Don't assume marital status, parental status, or sexual orientation.

- Gender field in intake: "How would you describe yourself?" — not "Male / Female" as required options. Include "Non-binary," "Prefer not to say."

7.2 Skin tone and undertone consent

- Intake collects skin tone information for makeup/skincare recommendations. This data point is sensitive but not legally regulated the same way as biometric data.

- Privacy Policy must disclose collection and use of this data.

- User may decline to provide (intake offers "prefer not to say"); the product gracefully degrades to non-tone-aware recommendations.

7.3 Marketing consent for transformation content

- The dual-wedge approach adds higher visibility transformation content (women's track marketing leans heavily on this).

- Marketing consent must be:

  - Granular: separate from photo-processing consent.

  - Specific in scope: "my anonymized before/after may appear in GlowRank marketing on TikTok, Instagram, Pinterest, and the GlowRank website."

  - Time-bounded or revocable: user can withdraw consent and request takedown.

  - Default unchecked.

8\. Tax Considerations

*Tax law varies enormously by jurisdiction. This is a flag list, not advice. Engage an accountant familiar with online services in your jurisdiction.*

8.1 Sales tax / VAT on digital services

- **US:** Several states require sales tax on digital services. Stripe Tax can automate.

- **EU / UK:** VAT applies on digital services to consumers at buyer's local rate.

- **Other:** Australia, Canada, Singapore, etc. require GST/local consumption tax.

8.2 Income tax

- Revenue is taxable income. Track from day 1.

- Contractor documentation (W-9s in US, equivalents elsewhere).

9\. Intellectual Property

9.1 Trademark

- File US trademark on "GlowRank" early. ~\$250–\$350 USPTO fee + lawyer fees.

- **Trademark scope:** Filing should cover classes 9 (software apps), 42 (SaaS), and 44 (beauty services) given the dual-wedge product scope.

- International (Madrid Protocol) only when justified.

9.2 Copyright

- Original copy, design, prompts are copyright-protected automatically.

- Maintain version history of prompts.

9.3 User-generated content rights

- Terms of Service grants license to process user submissions for service provision.

- User retains photo ownership.

- Marketing use of user photos requires separate explicit consent and clear scope (see Section 7.3).

10\. App Store Considerations (Phase 3)

Not applicable to Phase 1 web-only launch, but worth knowing for Phase 3.

10.1 Apple App Store

- Key sections for GlowRank: 1.1 (Safety), 3.1.1 (IAP), 5.1 (Privacy), 5.5 (MDM).

- Position as coaching, not rating.

- IAP at 30%/15% for in-app purchases.

10.2 Google Play

- Similar privacy and content guidelines.

- More flexible billing structure.

11\. Incident & Dispute Readiness

11.1 Incident response plan

- Single point of contact for complaints, media, legal demands.

- Safety incident logging and review.

- Data breach protocol (GDPR 72-hour notification; varies by state in US).

- Decision authority for refund, apology, or pause.

11.2 Chargeback handling

- Stripe dispute interface is first line.

- Respond within Stripe's window (7–20 days).

- Provide evidence: order details, intake contents, delivery confirmation, refund policy.

- Refund proactively to avoid chargebacks.

11.3 Subpoenas and legal requests

- Process for receiving and responding to legal requests.

- Photo retention/deletion documentation matters.

12\. Pre-Launch Legal Checklist

All items below should be complete before serving the first paying customer:

|     | **Item**                                                          | **Status**                        |
|-----|-------------------------------------------------------------------|-----------------------------------|
| ☐   | Business entity formed                                            | Required                          |
| ☐   | EIN / tax ID obtained                                             | Required                          |
| ☐   | Business bank account opened                                      | Required                          |
| ☐   | Stripe account verified                                           | Required                          |
| ☐   | Terms of Service drafted and lawyer-reviewed (incl. makeup scope) | Required                          |
| ☐   | Privacy Policy drafted and lawyer-reviewed (incl. skin-tone data) | Required                          |
| ☐   | Refund Policy drafted                                             | Required                          |
| ☐   | Photo Consent drafted and lawyer-reviewed                         | Required                          |
| ☐   | AI Disclosure published                                           | Required                          |
| ☐   | Gender-neutral consent language verified in all forms             | Required                          |
| ☐   | Required consents implemented in intake form                      | Required                          |
| ☐   | Age gate functioning at intake                                    | Required                          |
| ☐   | Photo retention/deletion automated and tested                     | Required                          |
| ☐   | EXIF stripping implemented                                        | Required                          |
| ☐   | Trademark filed across classes 9, 42, 44                          | Recommended                       |
| ☐   | Sales tax / VAT collection set up                                 | Required if applicable            |
| ☐   | Bookkeeping system live                                           | Recommended                       |
| ☐   | Incident response plan documented                                 | Required                          |
| ☐   | Insurance options reviewed                                        | Recommended                       |
| ☐   | BOTH clinical advisors engaged                                    | Required                          |
| ☐   | Makeup recommendation scope reviewed by lawyer                    | Required                          |
| ☐   | Pinterest ad policies reviewed                                    | Required if running Pinterest ads |
| ☐   | Gender-targeted advertising confirmed acceptable in jurisdiction  | Required                          |

—

*Legal for the dual-wedge approach is incrementally more complex than a single-wedge launch — but not radically. The new attention points are: makeup scope, skin-tone data, gender-neutral consent, and dual-track advertising. Spend \$400–\$1,500 with a lawyer covering these specifically. The fundamentals are unchanged.*

**END OF LEGAL CHECKLIST**
