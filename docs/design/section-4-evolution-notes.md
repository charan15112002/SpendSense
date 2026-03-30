# SECTION 4 — EVOLUTION & DECISION HISTORY

> **Purpose:** Companion document to `section-4-features-and-money-logic.md`
> **Why this exists:** Section 4 evolved through 7 iterations. The final locked document captures *what* was decided. This document captures *how* and *why* — what changed, what was rejected, and what principles emerged. The reasoning should not be lost.

---

## 1. Iteration Timeline

| # | Name | Trigger | Outcome |
|---|------|---------|---------|
| 1 | Original Feature List | Section 3 locked, proceed to features | 10-feature flat list with 7-state transaction model |
| 2 | Mature Money Model Rewrite | User rejected shallow feature list | 3-axis money model, 24+ economic types, 6-dimension reason ontology |
| 3 | Research Pass | User demanded primary-source evidence for all claims | Confirmed Google Play SMS blocker, FinArt precedent, NPCI data; 9 field test items created |
| 4 | Architecture Rewrite | User accepted research, demanded full structural document | 6-axis transaction model, dual distribution, self-identity graph, credit card ledger, frozen logic M1-M10 |
| 5 | Precision Corrections | User flagged overstated claims and missing platform constraints | Evidence tiers created (A6/A7), PhonePe/Paytm downgraded, per-use-case AI payloads, T10-T12 added |
| 6 | Micro-Corrections | User flagged 4 remaining factual precision issues | Low-RAM = unsupported (not degraded), DND downgraded to inference, FinArt/SMS policy wording tightened, T13-T14 added |
| 7 | Final Lock | User satisfied with precision | Locked 2026-03-27 |

---

## 2. Iteration 1 → 2: The Foundational Rejection

### What Iteration 1 looked like
- 10 features as a flat list, each mapping to problems/competitors/moat
- 7-state transaction model: genuine_spend, failed, reversed, pending, self_transfer, investment, income
- 3-layer detection: Notification Listener, SMS Reader, Backfill
- 12 default baskets with AI text analysis
- Billing cycle detection based on "large credit arrived → looks like salary"

### Why the user rejected it

> "We are NOT locking Section 4 yet. Do not respond with a shallow feature list. Redesign Section 4 around a mature money model first, and then derive the features from that model."

The user identified 9 specific failures:

1. **Notification listener assumed too strong** — "payment apps may not always send notifications for outgoing money, or behavior may vary app by app"
2. **SMS parsing logic undefined** — no clarity on rule engine vs AI vs hybrid, no source-of-truth rule when they disagree
3. **7 transaction states too flat** — demanded 3-axis model (status × flow × economic_type)
4. **Full transaction model missing** — needed 20+ economic types including self-transfer subtypes, investment flows, borrowed money, gifts, fees/penalties/taxes
5. **Purpose capture timing incomplete** — demanded complete decision table, not sample rules
6. **Basket engine too simple** — rejected merchant→category mapping, demanded proper reason ontology
7. **"Large credit = salary" assumption** — called it "poor and immature UX"
8. **Income classification incomplete** — demanded separation of 10+ income types
9. **AI usage vague** — every AI feature must specify input, output, fallback, confidence thresholds, privacy implications, failure modes

### Five permanent rules established

These rules governed all subsequent iterations:

1. Never give the app false confidence
2. Never design immature finance UX
3. Never assume a simple case when a real-world money edge case exists
4. Every feature must be future-ready, privacy-safe, Android-realistic, and explainable
5. Every AI usage must specify: input, output, fallback, confidence thresholds, privacy, failure modes

### What changed

- Flat feature list → model-first architecture with features derived from the model
- 7 states → 3-axis model (status × flow × economic_type) with 24+ economic types
- Simple baskets → 6-dimension reason ontology (life_area, counterparty_type, intent, recurrence, beneficiary, occasion)
- Assumed notification reliability → honest per-app reliability assessment
- Vague AI → 3-layer hybrid with explicit source-of-truth rules

---

## 3. Iteration 2 → 3: Evidence Discipline

### Why research was demanded

The user accepted the structural redesign but refused to lock because claims lacked primary-source backing. The user set explicit research rules:

- Prioritize Google Play policy pages, Android developer documentation, official NPCI/RBI/bank docs
- Do NOT rely on Wikipedia, Medium, Quora, generic blogs
- Separate: confirmed fact vs inference vs hypothesis needing device testing

### Key findings that changed the architecture

1. **Google Play SMS permission is a confirmed blocker** — Apps must be default SMS handler OR receive temporary exception. Bluecoins (1M+ installs) was DENIED. Axio retained READ_SMS as RBI-registered NBFC. This moved SMS-first from "Plan A" to "sideload only."

2. **NotificationListenerService more viable than expected** — Classified as high-risk but not independently blocked. FinArt (10K+ installs) on Play Store proves viability of automated expense tracking.

3. **NPCI mandates real-time SMS/email alerts** for all UPI transactions — bank SMS is RBI-mandated, making it a reliable signal for sideload.

4. **86% of UPI transactions are ≤₹500** — confirms micro-spending is the dominant pattern (validates P1).

5. **RuPay Credit on UPI** creates a new payment instrument type that looks like UPI debit but creates credit card liability — demanded credit card ledger design.

### Field test items created (T1-T9)

This iteration established the principle that unverified assumptions become explicit test items with fallback plans, not frozen facts.

---

## 4. Iteration 3 → 4: The Full Structural Document

### User's direction

> "This is the strongest research response so far, and it is good enough to proceed to the rewrite."

The user specified 8 remaining upgrades needed inside the architecture rewrite:

1. Self-identity graph must be fully designed (entities, evidence links, confidence levels, confirmation flow, evolution, deletion)
2. AI-absent mode must be designed fully (exact UX, which features work, accuracy claims, provider abstraction)
3. Credit card ledger must be fully designed (card spend, bill payment, min due, revolving balance, interest, late fee, EMI, RuPay credit on UPI, statement cycle, due date, outstanding view)
4. Cash wallet UX must be lightweight (exact UX after ATM, follow-up cadence, optional envelope, manual logging, how much user is asked to do)
5. Proven fact vs test-needed assumption must be clearly separated
6. Fake alert defense must handle spoof-like cases — "AI must never override weak structural authenticity"
7. Why-people-pay layer must be treated as a moat, not just classification
8. Full document in sections A through M

### What this iteration produced

This was the structural backbone — the document that all subsequent iterations refined:

- **Frozen Facts (A1-A5)** — only primary-source-defensible claims
- **Assumptions/Field Testing (T1-T9)** — each with test method and fallback
- **Architecture Decisions** — dual distribution (C1), Play Store pipeline (C2), sideload pipeline (C3), AI provider abstraction (C4)
- **6-Axis Transaction Model** — added payment_instrument, liability_effect, confidence to the original 3 axes
- **Self-Identity Graph** — 4 discovery methods (onboarding, transaction pattern, name-in-VPA, account hint accumulation)
- **AI Capability Layer** — 3-tier: Rules (always) → Patterns (always) → AI (optional)
- **Credit Card Ledger** — double-count prevention rule, separate liability accounts per card
- **Cash Wallet** — per-withdrawal balance, 3-tap max entry, never nag
- **Reason Ontology** — 6 dimensions, 20-cluster Indian money movement map
- **Frozen Logic M1-M10** — the binding decisions for all later sections

---

## 5. Iteration 4 → 5: Evidence Tier Separation

### What the user caught

> "Section 4 is very close now, but I do NOT want to lock it yet. This is now a precision/correction pass."

8 specific corrections:

1. **Overstated claims in frozen facts** — "Axio/Walnut exception because RBI-registered NBFC" and "consumer finance trackers without NBFC license are consistently denied" were stronger than evidence supports. No public data exists on Google's internal approval statistics.

2. **PhonePe/Paytm notification behavior frozen as fact** — Only market observation, not documented by either company. Needs field testing.

3. **Google Pay package name wrong** — Corrected to `com.google.android.apps.nbu.paisa.user`. Added principle: package lists are maintainable configuration, not permanent frozen constants.

4. **Category share data mislabeled** — "Groceries 30%" presented as if NPCI data. Actually PhonePe Pulse / provider-specific data. NPCI does NOT publish category breakdowns.

5. **Missing Android platform constraints** — Work profile limitations, low-RAM device constraints, listener disconnect/rebind behavior, notification access revocation, OEM instability.

6. **AI privacy payloads undefined per use case** — Demanded exact payload definitions for: transaction classification, purpose inference, insight generation, anomaly explanation.

7. **Foreground service assumed as frozen requirement** — Not proven necessary on all OEMs. Moved to field test.

### What this created

- **Evidence tier A6 (High-Confidence Inferences)** — strong basis but not primary-source proven
- **Evidence tier A7 (Market Observations)** — directional signals, source-attributed, explicitly not freezable
- **Per-use-case AI payload table** — exact fields sent, masked, and never-sent for each AI call type
- **Field test items T10-T12** — work profile, foreground service, rebind behavior

---

## 6. Iteration 5 → 6: Final Factual Precision

### What the user caught

> "This is not a redesign request. It is one final factual precision pass."

4 micro-corrections:

1. **Low-RAM Android Q and below** — User corrected: notification listeners cannot be bound at all on low-RAM devices running Android Q and below. Changed from "degraded scenario" to "UNSUPPORTED SCENARIO" — a platform-level block, not degraded behavior.

2. **DND claim too strong** — "DND does not suppress listener access" downgraded from frozen fact to high-confidence inference. Added T13 field test item.

3. **FinArt precedent wording too broad** — Revised to state only what public Play listing proves: "a Play-listed expense tracker can exist with this kind of automation." Does NOT prove NotificationListenerService-only is the reason for approvability.

4. **Google Play SMS policy wording incomplete** — A1 corrected to acknowledge the temporary-exception path exists. Architecture conclusion unchanged (still do not rely on READ_SMS).

### New field test items: T13, T14

- T13: DND mode and NotificationListenerService
- T14: Low-RAM devices on Android R+ (extending the Q-and-below platform block finding)

---

## 7. Earlier Assumptions That Were Rejected

| Assumption | When Rejected | Why | What Replaced It |
|---|---|---|---|
| SMS-first detection for Play Store | Iteration 3 (research) | Google Play restricts READ_SMS; Bluecoins denied | Notification-first for Play Store, SMS for sideload only |
| 7 flat transaction states | Iteration 2 | Too simplistic for real Indian money movement | 6-axis transaction model |
| "Large credit arrived = salary" | Iteration 2 | Immature UX; could be refund, investment return, etc. | Salary-confidence model with 5 signals (date recurrence, amount band, narration pattern, source consistency, past confirmations) |
| Fixed 12 basket categories | Iteration 2 | Merchant→category mapping too shallow | 6-dimension reason ontology |
| Gemini as product dependency | Iteration 2 | Vendor lock-in; violates privacy principles | Provider-agnostic AI capability layer, 3-tier with AI optional |
| PhonePe/Paytm notification as confirmed fact | Iteration 5 | No primary-source documentation | Moved to market observation + field test (T1b, T1c) |
| Category share % as NPCI data | Iteration 5 | NPCI does not publish category breakdowns | Relabeled as PhonePe Pulse / provider-specific |
| DND does not suppress listener (frozen fact) | Iteration 6 | No explicit official documentation | Moved to high-confidence inference + T13 |
| Low-RAM devices = degraded scenario | Iteration 6 | Platform docs say listeners CANNOT be bound | Changed to unsupported scenario (platform block) |
| Foreground service as frozen requirement | Iteration 5 | Not proven necessary on all OEMs | Moved to field test T11 |
| "Consumer trackers consistently denied READ_SMS" | Iteration 5 | No public data on Google's internal approvals | Moved to high-confidence inference |
| FinArt proves NotificationListener is sufficient | Iteration 6 | Play listing doesn't prove which permission is the basis | Narrowed to: proves automated expense tracker can exist on Play Store |

---

## 8. Field Test Item Evolution

| Item | When Added | Why |
|------|-----------|-----|
| T1 | Iteration 4 | GPay notification parsing needs real-device verification across OEMs |
| T1b | Iteration 5 | PhonePe separated from T1 — weaker evidence basis |
| T1c | Iteration 5 | Paytm separated from T1 — behavior changes across versions |
| T2 | Iteration 4 | OEM battery optimization kills services unpredictably |
| T3 | Iteration 4 | Bank SMS regex stability for sideload path |
| T4 | Iteration 4 | User willingness to grant notification access |
| T5 | Iteration 4 | Dual-SIM edge case |
| T6 | Iteration 4 | UPI Lite may be silent (no notification) |
| T7 | Iteration 4 | Fake/spam SMS distinguishability |
| T8 | Iteration 4 | Self-transfer detection across VPA formats |
| T9 | Iteration 4 | Gemini Flash free tier throttling limits |
| T10 | Iteration 5 | Work profile may block listener |
| T11 | Iteration 5 | Foreground service moved from assumption to test |
| T12 | Iteration 5 | Listener rebind after system kill varies by OEM |
| T13 | Iteration 6 | DND claim downgraded, needs verification |
| T14 | Iteration 6 | Low-RAM on Android R+ — extending the Q-and-below finding |

---

## 9. Frozen Logic M1-M10: How They Emerged

The frozen logic items did not exist in Iterations 1-3. They were created in Iteration 4 as the binding decisions that all subsequent sections must respect.

- **M1 (Detection Architecture)** — Direct consequence of the Google Play SMS blocker discovery (Iteration 3). The dual distribution model was the single biggest architectural decision in Section 4.
- **M2 (Transaction Model)** — Evolved from 7 flat states (Iteration 1) → 3-axis model (Iteration 2) → 6-axis model (Iteration 4). The addition of payment_instrument and liability_effect came from the credit card and RuPay Credit on UPI requirements.
- **M3 (Intelligence Tiers)** — Born from the user's insistence that AI must be optional (Iteration 2). The 3-tier structure (Rules → Patterns → AI) ensures the app works without any AI provider.
- **M4 (Self-Identity Graph)** — Demanded by user in Iteration 3 as prerequisite for self-transfer detection. Fully designed in Iteration 4 with 4 discovery methods.
- **M5 (Trust Scoring)** — Emerged from the fake alert defense requirement (Iteration 3). The 0-100 score and 5-phase ramp were designed in Iteration 4.
- **M6 (Credit Card Ledger)** — Triggered by user identifying the double-counting problem (Iteration 3): both card spend and bill payment cannot both be "spending."
- **M7 (Cash Wallet)** — User demanded lightweight design in Iteration 3. The "3-tap max, never nag" principle came from the notification fatigue problem (P14).
- **M8 (Reason Ontology)** — Evolved from 12 fixed baskets (Iteration 1) → 6-dimension ontology (Iteration 2) → elevated to moat-level importance (Iteration 4).
- **M9 (Privacy Contract)** — Tightened across iterations. Generic "local-first" (Iteration 2) → per-use-case AI payloads (Iteration 5) → raw notification text NEVER sent to AI (Iteration 5).
- **M10 (Fake Defense)** — 5-layer defense designed in Iteration 4. Key principle from user: "AI must never override weak structural authenticity."

---

## 10. Final Principles That Emerged

These principles were not stated upfront — they emerged through the iterative process:

1. **Evidence hierarchy is sacred.** Frozen fact > High-confidence inference > Market observation > Field test needed. Nothing moves up without primary-source proof.

2. **Model first, features second.** Features are derived from the money model, not listed independently. This was the foundational insight from Iteration 2.

3. **Detection architecture is distribution-dependent.** Play Store = notification-first. Sideload = SMS-first. One codebase, build flavor flag. This was the biggest architectural decision.

4. **AI is always optional.** 3-tier intelligence (Rules → Patterns → AI). The app must be fully functional with zero AI. No provider lock-in.

5. **Privacy is defined per use case.** Exact payload definitions for each AI call. Raw notification text NEVER sent to AI. "Local-first" is not enough — you must specify what leaves the device and why.

6. **Trust is earned, not assumed.** 0-100 trust scores, 5-phase trust ramp, confidence-based UX gating. The app does not pretend to know things it doesn't.

7. **Indian money behavior is a moat.** The 6-dimension reason ontology and 20-cluster money movement map are competitive advantages, not just classification tools.

8. **Failed/reversed/pending/self-transfers NEVER count as spending.** This is absolute and non-negotiable.

9. **Credit card double-count prevention is absolute.** Card spend = spending, bill payment = liability settlement. Never both.

10. **Assumptions that fail testing get fallbacks, not excuses.** Every field test item (T1-T14) has a defined fallback if the assumption is wrong. No feature depends on a single assumption being true.

---

## 11. What This Evolution Teaches for Sections 6-11

The Section 4 process established patterns that should carry forward:

- **Do not lock on first draft.** Structural → evidence → precision → micro-correction is the right sequence.
- **Separate evidence tiers explicitly.** Every claim needs a source tier and a "what would confirm it" statement.
- **The user's instinct for edge cases is a feature, not a blocker.** Every "but what about..." from the user made the architecture more robust.
- **Precision passes are cheap, wrong assumptions are expensive.** The micro-corrections in Iteration 6 took minimal effort but prevented real architectural mistakes (low-RAM as "degraded" vs "unsupported" changes implementation entirely).
