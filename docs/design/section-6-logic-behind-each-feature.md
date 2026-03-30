# SECTION 6 — LOGIC BEHIND EACH FEATURE

> **Status:** LOCKED on 2026-03-28
> **Dependencies:** Sections 1-5 (all locked)
> **Scope:** For every locked feature/system in Section 4, this section explains: why it exists, which problems it solves, how it works step by step, trigger conditions, confidence rules, failure modes, fallback logic, dependencies, and what is deferred beyond v1.

---

## How to Read This Section

Section 4 defined *what* exists. Section 5 defined *how it looks and feels*. This section explains *the logic* — the internal reasoning, step-by-step mechanics, and edge-case handling for each system.

Each system is documented with a consistent structure:

1. **Why it exists** — which locked problems (P1-P16) it solves and why the solution takes this form
2. **How it works** — step-by-step operational logic
3. **Trigger conditions** — what causes it to activate
4. **Confidence rules** — how certainty is assessed and communicated
5. **Failure modes** — what can go wrong
6. **Fallback logic** — what happens when it fails
7. **Dependencies** — what other systems it requires
8. **Deferred beyond v1** — what is explicitly not built now

---

## SYSTEM 1: AUTOMATIC TRANSACTION DETECTION

*Section 4 references: F1, C1-C3, Section 6 (Source Architecture)*

### 1.1 Why It Exists

**Problems solved:** P1 (invisible micro-spending), P2 (manual tracking friction), P7 (context lost within hours), P13 (connectivity gaps)

Manual entry fails within 3 days (P2). If detection is not automatic, the entire product fails. The user's daily rhythm is: tap UPI, pay, move on. SpendSense must capture that moment without the user doing anything.

The detection system exists because the product's core promise — "truth engine for Indian money movement" — is impossible without automated, real-time transaction capture.

### 1.2 How It Works

Two pipelines exist, selected at build time by `DISTRIBUTION=playstore|sideload` flag. Same codebase, different primary source.

#### Play Store Pipeline (C2)

```
1. Android delivers notification via onNotificationPosted()
2. FILTER: Check notification package against whitelist JSON
   - Match → proceed
   - No match → discard immediately, nothing stored
3. PARSE: Apply bank/app-specific regex template
   - Extract: amount, merchant/VPA, account_hint, timestamp
   - If template matches → template_match score = 20
   - If partial match → template_match score = 12
   - If no template → attempt generic amount+merchant extraction, score = 8
4. VALIDATE: Check extracted data completeness
   - Amount is required. If missing → discard (not a transaction notification)
   - Merchant/VPA optional but contributes to trust score
5. DEDUP: Fingerprint check (amount ± ₹1 + same flow + within 30 min)
   - If duplicate found → merge, keep higher-trust source
   - If not duplicate → create new transaction record
6. SCORE: Calculate trust score (0-100) from 6 signals
7. CLASSIFY: Run through intelligence pipeline (System 3)
8. STORE: Write transaction with full provenance (source app, raw text,
   trust score, all 6 axes, timestamp)
```

#### Sideload Pipeline (C3)

```
1. SMS arrives via BroadcastReceiver (real-time)
   OR SMS read from inbox on first launch (backfill)
2. FILTER: Check sender against known bank shortcode database
   - Match → proceed
   - No match → check for financial keywords as secondary filter
   - Neither → discard
3. PARSE: Hybrid 3-layer model
   Layer A — Rule Engine (<1ms):
     - Bank-specific regex patterns
     - Extract: amount, account_hint, UPI_ref, balance, merchant/VPA, timestamp
     - Detect failure/promotional phrases
     - If confidence >= 80% → use result, skip Layer B
   Layer B — AI Classification (only when Layer A confidence < 80%):
     - Input: sanitized SMS (account numbers masked, phone numbers masked)
     - Output: structured JSON with confidence
     - If unavailable (no AI configured) → skip to Layer C
   Layer C — User Confirmation (only when combined confidence < 70%):
     - Store transaction with status = success (the payment likely happened)
     - Set review_flag = needs_review (this is a queue/backlog flag, NOT a status axis value)
     - Add to classification backlog
4. CROSS-CHECK: Look for notification matching same transaction
   - If both sources agree → trust = max(sms_trust, notif_trust) + 10
     (corroboration bonus)
   - If they disagree → apply source-of-truth rules:
     Rule engine says failed with high confidence → trust rule engine
     Rule engine says debit but AI says not a transaction → trust AI
     Both agree → auto-classify
     Both disagree, both low confidence → user review
5-8. Same as Play Store: DEDUP → SCORE → CLASSIFY → STORE
```

### 1.3 Trigger Conditions

| Trigger | Pipeline | Timing |
|---------|----------|--------|
| Notification posted by whitelisted app | Play Store (primary), Sideload (secondary) | Instant — fires as OS event |
| SMS received from known bank sender | Sideload only | Near-instant (1-5 seconds) |
| App first launch after install | Sideload only | One-time backfill of SMS inbox |
| App opened after listener was killed | Both | Check if any notifications were missed during gap |

### 1.4 Confidence Rules

Detection confidence feeds into the trust score (System 5: Source-Trust Scoring), not directly into UX. The detection system's job is to extract data and compute raw trust signals. The trust-scoring system decides what to show the user.

- Bank app notification with template match: sender_trust 25 + template_match 20 = strong start
- UPI app notification: sender_trust 20
- User-added custom package (unverified source): sender_trust 5, trust capped at 40 (M10)
- Non-whitelisted package (not user-added): discarded at Step 2, never enters scoring
- Bank SMS shortcode + template match: sender_trust 25 + template_match 20
- SMS with link: automatic trust = 0 (M10), flagged as phishing

### 1.5 Failure Modes

| Failure | Cause | Impact |
|---------|-------|--------|
| Listener killed by OEM | Samsung/Xiaomi/Realme battery optimization | Transactions missed until rebind |
| Notification access revoked | User action in Settings | All detection stops |
| Notification truncated | Android text limit, custom ROM | Partial data extracted — amount may be present but merchant missing |
| App doesn't send notification | User disabled app notifications, or app changed behavior | Transaction invisible to Play Store version |
| SMS delayed by network | Telco congestion | Sideload: delayed detection. Play Store: relies on notification |
| SMS deleted before read | User or cleaner app | Sideload backfill misses it |
| DND mode suppresses listener | Unconfirmed — T13 | Potentially missed until DND off |
| Work profile isolates notifications | Android platform behavior | Transactions from work-profile apps invisible |
| Dual-SIM second SIM missed | Unconfirmed — T5 | Blind spot for second SIM |
| RCS messages not readable | Platform limitation | If bank shifts to RCS, SMS pipeline misses it |

### 1.6 Fallback Logic

| Failure | Fallback |
|---------|----------|
| Listener killed | On next app open: detect gap, prompt user. If foreground service helps (T11), enable per-OEM. Guide user to exclude from battery optimization. |
| Notification access revoked | Persistent home banner (Section 5, 9.3). App works in manual-entry mode. |
| Notification truncated | Store partial data. Mark merchant as "Unknown." Ask user to identify. |
| App doesn't send notification | Transaction captured only if bank SMS exists (sideload) or user enters manually. Known blind spot — disclosed honestly. |
| SMS delayed | Transaction appears when SMS arrives. Not real-time, but still captured. |
| Work profile | Inform user in Settings (Section 5, 9.2). Suggest moving banking apps to personal profile. |
| DND | If T13 confirms suppression: inform user or guide to DND exception. |

### 1.7 Dependencies

- **Android NotificationListenerService** — core platform dependency
- **Package whitelist JSON** — must be maintained and updatable
- **Bank SMS shortcode database** — sideload only
- **Regex template library** — bank-specific patterns
- **System 5 (Source-Trust Scoring)** — receives raw signals from detection
- **System 3 (Intelligence Pipeline)** — receives extracted data for classification
- **System 4 (Self-Identity Graph)** — needed for self-transfer detection during parsing

### 1.8 Deferred Beyond v1

- Account Aggregator (AA) integration — RBI-regulated, T+1 data, future reconciliation source
- Bank statement PDF import — fragile parsing, format varies by bank
- Screen scraping / accessibility service — too invasive, never planned
- RCS message reading — platform doesn't support yet
- Notification from wearables — not scoped

---

## SYSTEM 2: 6-AXIS TRANSACTION MODEL

*Section 4 references: D1, D2, M2*

### 2.1 Why It Exists

**Problems solved:** P1 (invisible spending — by correctly separating real spend from noise), P4 (dirty data — by classifying failed/reversed/promos), P5 (income side ignored — by modeling inflows with same rigor), P9 (data fragmentation — by unifying all instruments under one model), P12 (mis-categorization — by providing enough axes to be precise)

A flat list of "transactions" cannot distinguish ₹5,000 to BigBazaar (genuine spend) from ₹5,000 to your own HDFC account (self-transfer) from ₹5,000 credit card bill payment (liability settlement). All three show as "-₹5,000" in a naive tracker. The 6-axis model exists to ensure every rupee movement is understood, not just recorded.

### 2.2 How It Works

Every transaction is assigned 6 independent axes:

```
AXIS 1: STATUS — Is this real?
  success | failed | pending | reversed | refunded | disputed | expired
  Rule: Only success transactions count toward any total. Everything else
  is tracked for history but excluded from dashboards.

AXIS 2: FLOW — Which direction?
  outflow | inflow | internal
  Rule: internal (self-transfer) is excluded from both spend and income.

AXIS 3: ECONOMIC TYPE — What kind of money movement?
  27 types (see Section 4, D1 table)
  Rule: Each type maps to exactly one dashboard category
  (Spend / True Income / Non-Income Credit / Not Counted / etc.)

AXIS 4: PAYMENT INSTRUMENT — How was it paid?
  bank_account | credit_card | rupay_credit_on_upi | debit_card | upi |
  upi_lite | wallet | cash | neft_rtgs_imps | auto_debit | unknown
  Rule: Instrument determines liability_effect. credit_card and
  rupay_credit_on_upi create liability.

AXIS 5: LIABILITY EFFECT — Does this change what you owe or are owed?
  creates_liability | settles_liability | reduces_receivable |
  increases_receivable | none
  Rule: creates_liability means money was spent but debt was created
  (credit card). settles_liability means debt was reduced (bill payment).

AXIS 6: CONFIDENCE — How sure are we?
  auto_high (95-100%) | auto_medium (80-94%) | suggested (50-79%) |
  uncertain (0-49%) | user_confirmed | user_override
  Rule: Confidence determines whether the transaction appears as
  "Confirmed" or "Estimated" in home totals, or is excluded entirely.
```

#### Classification Priority Order (D2)

```
1. User override exists → use user's classification (always wins)
2. Pattern memory match (>=3 confirmations, same merchant) → use pattern
3. Rule-based detection (priority cascade):
   a. Self-identity match on both sides → self_transfer
   b. Salary markers → salary_credit
   c. ATM withdrawal keywords → cash_withdrawal
   d. Credit card bill payment keywords → credit_card_payment
   e. EMI keywords → emi_payment
   f. Known investment platform → investment_out/return
   g. Known subscription → subscription
   h. Known utility → bill_payment
   i. Government payment keywords → government_payment
4. AI classification (if available) → AI-suggested type with confidence
5. Amount + time heuristics
6. Fallback → unclassified (prompt user)
```

### 2.3 Trigger Conditions

The model is applied to every detected transaction at the moment of detection. It is not a separate system that runs independently — it is the structure imposed on every transaction by System 1 (Detection) and System 3 (Intelligence).

Re-classification triggers:
- User corrects a classification → axes updated, pattern memory updated
- Pattern memory reaches 3-confirmation threshold → future transactions auto-classified
- AI provider added/changed → queued unclassified items can be re-evaluated

### 2.4 Confidence Rules

Mapped to Section 5's 5-state model:

| 6-Axis Confidence | Section 5 State | Home Total Treatment |
|-------------------|----------------|---------------------|
| user_confirmed / user_override | Confirmed | Counted in "Confirmed" subtotal |
| auto_high (95-100%) | Learned (if from pattern) or Confirmed | Counted in "Confirmed" subtotal |
| auto_medium (80-94%) | Learned or Suggested | Counted in "Estimated" subtotal |
| suggested (50-79%) | Suggested | Counted in "Estimated" subtotal |
| uncertain (0-49%) | Unclassified | NOT counted until classified |
| N/A (trust flag) | Quarantined | NOT counted until user confirms |

### 2.5 Failure Modes

| Failure | Cause | Impact |
|---------|-------|--------|
| Wrong economic_type assigned | Ambiguous notification text, new merchant | Transaction lands in wrong dashboard bucket |
| Self-transfer classified as outflow | Identity graph incomplete — destination account not yet known | Inflates spend total |
| Credit card payment classified as spending | Bill payee pattern not recognized | Double-counts spending |
| Inflow classified as income when it's a refund | Refund keyword missing from notification | Inflates income total |
| Pending transaction never resolves | Bank doesn't send resolution notification | Stays pending forever, never counted |

### 2.6 Fallback Logic

| Failure | Fallback |
|---------|----------|
| Wrong economic_type | User corrects → pattern memory updated → future instances correct. 2 corrections in a row → confidence resets to 50%. |
| Self-transfer misclassified | When identity graph learns the destination account (System 4), retroactively reclassify past transactions matching same pair. |
| Credit card payment as spending | Bill payee pattern list is updatable config. User can manually mark as "card payment." |
| Pending never resolves | After 7 days pending: show in Txns tab as "Pending — not counted." After 30 days: prompt user "Did this go through?" |
| Unclassified stays unclassified | 30-day escalation path (Section 5, 7.3): classify or archive as "Uncategorized." |

### 2.7 Dependencies

- **System 1 (Detection)** — provides raw extracted data
- **System 3 (Intelligence)** — performs the actual classification
- **System 4 (Identity Graph)** — required for self-transfer detection (Axis 2/3)
- **System 6 (Credit Card Ledger)** — required for liability_effect assignment (Axis 5)

### 2.8 Deferred Beyond v1

- Disputed status handling (manual flag only, no bank API)
- Chargeback flow
- Multi-currency support
- Tax classification overlay
- Investment performance tracking (only money-in/money-out is tracked)

---

## SYSTEM 3: 3-TIER INTELLIGENCE PIPELINE

*Section 4 references: F1-F5, C4, M3*

### 3.1 Why It Exists

**Problems solved:** P6 (generic budgets — by learning personal patterns), P7 (context lost — by capturing purpose at detection time), P12 (mis-categorization — by combining rules, memory, and AI), P15 (no financial education — by enabling insights), P16 (no emotional connection — by understanding purpose, not just category)

Competitors either use dumb regex (unreliable) or require cloud sync (privacy violation). SpendSense needs classification that is accurate, private, and improves over time without mandatory AI. The 3-tier architecture solves this: rules handle the obvious, patterns handle the recurring, AI handles the ambiguous — and the app works fully without AI.

### 3.2 How It Works

```
TIER 1: RULE ENGINE (always active, zero dependency)

  Input: Extracted transaction data (amount, merchant, VPA, keywords)

  What it handles:
  - Status detection (failed/success/pending/reversed — keyword matching)
  - Flow detection (debited/credited/transferred — keyword matching)
  - Known merchant classification (hardcoded map of 200+ Indian merchants)
    Examples: "ZOMATO" → food_social, "JIO" → telecom, "IRCTC" → transport_travel
  - Self-transfer detection (both sides in identity graph)
  - Promotional/spam filtering (keywords: "offer", "cashback", "click here")
  - Duplicate detection (fingerprint matching)
  - Account hint extraction (xx4523 pattern)
  - UPI reference extraction

  Coverage: ~60-70% of transactions classified
  Speed: <1ms per transaction
  Privacy: Zero external calls

  Output: { economic_type, confidence, classification_source: "rule" }

TIER 2: PATTERN MEMORY (always active, learns from user)

  Input: Same data + user's classification history

  What it handles:
  - Merchant → category mapping (after 3 confirmed same-classifications)
  - Time-of-day patterns (morning coffee, evening groceries)
  - Amount-range patterns (₹50-100 at same merchant = daily purchase)
  - Recurring transaction detection (same amount, same merchant, monthly)
  - Salary detection (5-signal model: date + amount + narration + source +
    user confirmation)

  Confidence thresholds:
  - 0-49%: Always ask user
  - 50-79%: Show suggestion + alternatives
  - 80-94%: 1-tap confirm
  - 95%+: Silent auto-classify

  Correction loop:
  - Each confirmation: +5 to +15 confidence (varies by current level)
  - Each correction: -15 to -25 confidence
  - 2 corrections in a row from same merchant: confidence resets to 50%

  Coverage: Additional ~15-20% (cumulative ~75-90%)
  Speed: <5ms (local DB lookup)
  Privacy: Zero external calls

  Output: { economic_type, life_area, confidence,
            classification_source: "pattern", pattern_basis: "N confirmations" }

TIER 3: AI PROVIDER (optional, provider-agnostic)

  Input: Sanitized payload (see Section 4 F5 — exact fields per use case)

  What it handles:
  - Ambiguous merchant classification ("KRISHNA STORES" could be grocery
    or restaurant)
  - Purpose inference from context
  - Natural language reason extraction
  - Spending insight generation
  - Anomaly explanation

  Provider interface:
    AIProvider.classify(transaction) → { economic_type, life_area,
      confidence, reasoning, tokens_used, latency_ms }
    AIProvider.isAvailable() → boolean

  Supported Phase 1: GeminiFlashProvider, NoneProvider
  Future: OpenAIProvider, ClaudeProvider, OnDeviceProvider

  Call budget (Gemini free tier):
    Max 15 requests/minute
    Max 1,500 requests/day (conservative)
    Priority queue:
      1. User-initiated "classify this" (immediate)
      2. High-amount unclassified (>₹1,000)
      3. Batch classification (background, 2x daily)
      4. Insight generation (once daily, evening)
    If quota exceeded: queue for next window, never block detection

  Coverage: Remaining ~10-15% (cumulative target: ~85% day 1 with AI,
            ~60% day 1 without AI, improving to ~80% by month 2)
  Speed: 500-2000ms (network dependent)
  Privacy: Per-use-case payloads (M9). NEVER: raw text, account numbers,
           VPA handles, phone numbers, bank names, balance.

  Output: { economic_type, life_area, confidence, reasoning,
            classification_source: "ai", provider: "gemini_flash" }
```

#### Source-of-Truth Rules When Tiers Disagree

```
Rule engine says FAILED with high confidence → TRUST RULE ENGINE
  (Failure detection is structural — keywords like "rejected", "declined"
   are definitive signals)

Rule engine says DEBIT but AI says NOT a transaction → TRUST AI
  (AI is better at catching promotional/mandate-setup false positives)

Both agree → auto-classify
  (Highest confidence)

Both disagree, both low confidence → USER REVIEW
  (Neither system is reliable enough to decide alone)

User override → ALWAYS WINS
  (Overrides everything. Feeds back into pattern memory.)
```

### 3.3 Trigger Conditions

| Trigger | What Runs |
|---------|-----------|
| Transaction detected | Tier 1 always. Tier 2 always. Tier 3 only if Tier 1+2 confidence < 80% AND AI configured. |
| User classifies/corrects a transaction | Pattern memory updated. If pattern now has 3+ confirmations, future matches auto-classify. |
| User enables AI provider | Queued unclassified transactions evaluated in batch. |
| Daily background cycle | Tier 3 batch: classify remaining unclassified. Insight generation. |
| User taps "classify this" | Immediate Tier 3 call (if AI configured), bypassing queue. |

### 3.4 Confidence Rules

See Tier 2 confidence thresholds above. Additionally:

- AI confidence is additive to trust score (Signal 5: 0-10 points) but NEVER overrides structural trust
- AI NEVER promotes a low-trust message (trust < 40) into normal flow — max AI contribution is ±10 points (M10)
- Pattern memory confidence requires 3 confirmations before reaching auto-classify threshold
- Confidence decays on correction: designed to prevent the system from stubbornly repeating mistakes

### 3.5 Failure Modes

| Failure | Cause | Impact |
|---------|-------|--------|
| Rule engine misparses | New bank SMS format, unexpected keyword | Wrong status/flow. Could count failed as success. |
| Pattern learns wrong association | User accidentally confirmed wrong category 3x | Auto-classifies incorrectly going forward |
| AI returns wrong classification | Ambiguous merchant, model hallucination | Wrong category with potentially high confidence |
| AI unavailable | API key invalid, quota exceeded, network down | Tier 3 skipped entirely |
| AI latency too high | Network issues | Classification delayed, not blocked |

### 3.6 Fallback Logic

| Failure | Fallback |
|---------|----------|
| Rule engine misparse | AI (if available) catches it. If not, user review. v1 learnings: "CBS Rejection" not in failure keywords caused false debits — rule engine must have comprehensive failure phrase list. |
| Wrong pattern learned | User corrects → 2 corrections reset confidence to 50%. Pattern effectively unlearned. |
| AI wrong | User corrects. AI confidence for that merchant/pattern reduced. Rule engine + pattern memory handle future. |
| AI unavailable | App operates at Tier 1+2. More transactions go to "Unclassified." User asked more often. App remains fully functional (M3). |
| All tiers fail | Transaction stored as "Unclassified." Enters purpose-capture prompt flow (System 8). Eventually: user classifies, or 30-day archive. |

### 3.7 Dependencies

- **System 1 (Detection)** — provides extracted data
- **System 2 (Transaction Model)** — structure for classification output
- **System 4 (Identity Graph)** — self-transfer detection
- **AI provider interface** — optional external dependency
- **Known merchant database** — 200+ hardcoded, updatable
- **Pattern memory database** — local storage, grows with user history

### 3.8 Deferred Beyond v1

- On-device AI model (when mobile models are small/fast enough)
- App-managed AI provider (when SpendSense has revenue to fund API costs)
- Cross-device pattern sync (no cloud in Phase 1)
- Multi-language SMS parsing (English/Hinglish only in v1)

---

## SYSTEM 4: SELF-IDENTITY GRAPH

*Section 4 references: Section 7 (E1-E5), M4*

### 4.1 Why It Exists

**Problems solved:** P1 (invisible spending — self-transfers inflate totals if not detected), P4 (dirty data — self-transfers are noise, not signal), P9 (data fragmentation — user has 2.3 bank accounts on average, multiple VPAs, wallets, cards)

If a user moves ₹20,000 from their SBI account to their HDFC account, a naive tracker counts it as -₹20,000 spending and +₹20,000 income. The user appears to have both spent and earned ₹20,000. In reality, nothing happened — money moved between their own pockets. The identity graph exists to know which pockets belong to the same person.

### 4.2 How It Works

```
IDENTITY GRAPH STRUCTURE

  Known Identities (status: confirmed):
  ├── VPAs: charan@oksbi, 9876543210@ybl, 9876543210@paytm
  ├── Account hints: SBI xx4523, HDFC xx8901
  ├── Cards: HDFC CC xx2345
  ├── Wallets: Paytm (9876543210)
  └── Phone: 9876543210

  Suspected Identities (status: suspected):
  ├── VPA: kumar.c@ibl (seen in transfer matching own account)
  └── Account: ICICI xx6789 (salary deposit target)

FOUR DISCOVERY METHODS:

METHOD 1: Onboarding Declaration
  User enters phone number → auto-derive VPA patterns:
    {phone}@ybl, {phone}@paytm, {phone}@ibl, {phone}@axl
  User optionally selects banks → seed account hint expectations
  User confirms which derived VPAs are theirs
  Confidence: 100% (user_declared)

METHOD 2: Transaction Pattern Detection
  When: outflow detected to VPA/account X
  AND: inflow of same amount detected within 5 minutes
  AND: inflow source matches VPA/account X
  THEN: flag as suspected self-transfer
  If this happens 2+ times with same X:
    → Ask user: "Is [X] your own account?"
    → Yes: add to graph as confirmed
    → No: mark as frequent_recipient, never ask again
  Confidence: 85% (self_transfer_detected)

METHOD 3: Name-in-VPA Matching
  If user's declared name contains "charan"
  AND a VPA contains "charan" (e.g., charan.k@oksbi):
    → Flag as suspected_own_vpa (confidence: 60%)
    → Do NOT auto-classify as self-transfer
    → Ask user on first occurrence
  Confidence: 60% (name_match_in_vpa) — always ask, never assume

METHOD 4: Account Hint Accumulation
  Every notification says "from A/c xx4523" or "to A/c xx8901"
  Build set of account_hints seen in user's OWN transactions
  After 5+ transactions from same hint → confirmed as user's own
  When a TRANSFER targets a known own-account hint → high confidence
  self-transfer
  Confidence: progresses from 0 to confirmed with evidence count
```

#### Self-Transfer Detection Decision Table

| Source | Destination | Both in Graph? | Classification | Confidence |
|--------|------------|---------------|---------------|------------|
| Own (confirmed) | Own (confirmed) | Yes | self_transfer (auto) | 95%+ |
| Own (confirmed) | Suspected own | Partial | self_transfer (suggested) | 75% — ask user |
| Own (confirmed) | Unknown | No | Normal outflow | N/A |
| Suspected own | Own (confirmed) | Partial | self_transfer (suggested) | 75% — ask user |
| Unknown | Own (confirmed) | Partial | Normal inflow | N/A |

### 4.3 Trigger Conditions

| Trigger | Action |
|---------|--------|
| Onboarding completed | Seed graph with declared identities |
| Transaction detected with VPA/account data | Check against graph for self-transfer |
| Suspected self-transfer pattern detected (2+ occurrences) | Prompt user to confirm identity |
| User manually adds identity in Settings | Add to graph as confirmed |
| User confirms "Is this your account?" prompt | Promote from suspected to confirmed |

### 4.4 Confidence Rules

| Source | Confidence |
|--------|-----------|
| user_declared (onboarding, manual add) | 100% |
| onboarding_auto_derived (phone → VPA) | 100% after user confirms |
| self_transfer_detected (pattern) | 85% — high enough to suggest, not to auto-classify |
| salary_deposit_target | 80% |
| name_match_in_vpa | 60% — always ask |

Rule: No identity is auto-confirmed without user action except account hints after 5+ transactions from the same hint.

### 4.5 Failure Modes

| Failure | Cause | Impact |
|---------|-------|--------|
| Self-transfer classified as spending | Identity not yet in graph | Spend total inflated |
| Spending classified as self-transfer | Two different people share similar VPA pattern | Spend total understated |
| Phone number VPA belongs to someone else | User gave phone to family member who has different VPA | Wrong identity association |
| Name match false positive | Common name in VPA (e.g., "kumar" appears in both user and merchant) | False self-transfer suggestion |
| Identity graph never grows past onboarding | User skips onboarding, low transaction volume | Self-transfer detection limited |

### 4.6 Fallback Logic

| Failure | Fallback |
|---------|----------|
| Self-transfer as spending | When graph eventually learns the account, retroactively reclassify matching past transactions to self_transfer. Adjust totals. |
| Spending as self-transfer (false positive) | User corrects → identity removed from graph. Past transactions reclassified. |
| Name match false positive | Method 3 always asks — never auto-confirms. User says "No" → never ask again for that VPA. |
| Graph stays minimal | App works with minimal graph. More transactions show as regular outflow/inflow. No data corruption — just less optimization. |

### 4.7 Dependencies

- **System 1 (Detection)** — provides VPA/account data from notifications/SMS
- **Onboarding flow** — seeds initial identities
- **Local storage** — graph persists across sessions

### 4.8 Deferred Beyond v1

- Account Aggregator confirmation (AA can definitively confirm account ownership)
- Joint account detection (P11 — Phase 2)
- Family member identity graph (separate but related)
- Cross-device graph sync

---

## SYSTEM 5: SOURCE-TRUST SCORING

*Section 4 references: Trust Ramp, Source-Trust Scoring Model, M5*

### 5.1 Why It Exists

**Problems solved:** P4 (dirty data — fake alerts, promos, duplicates), P8 (privacy fear — by being transparent about detection confidence), P12 (mis-categorization — trust score gates what gets auto-classified vs what the user must review)

Not all transaction signals are equally reliable. A notification from SBI YONO app with a UPI reference number is far more trustworthy than an SMS from an unknown number claiming "Rs 49,999 credited." The trust score exists to quantify this reliability and let it drive UX decisions — what to auto-classify, what to show for review, what to quarantine.

### 5.2 How It Works

```
TRUST SCORE = sum of 6 weighted signals (0-100)

SIGNAL 1: SENDER TRUST (0-25)
  Bank app notification: 25
  UPI app notification: 20
  Bank SMS (shortcode): 25
  Bank SMS (regular number): 15
  User-added custom package (unverified source): 5
  Unknown SMS sender: 0
  (Non-whitelisted packages that the user has NOT added are
   discarded at detection — they never reach trust scoring)

SIGNAL 2: TEMPLATE MATCH (0-20)
  Matches known bank template exactly: 20
  Partial match: 12
  Has amount+merchant but no template: 8
  Unstructured text: 0

SIGNAL 3: TRANSACTION PROOF (0-20)
  Contains UPI reference number: 20
  Contains transaction ID: 15
  Contains account number hint: 10
  No reference: 0

SIGNAL 4: CORROBORATION (0-15)
  Same transaction from 2+ sources: 15
  1 source only: 5
  Conflicting data from sources: 0

SIGNAL 5: AI CONFIDENCE (0-10)
  AI confidence > 90%: 10
  AI 70-89%: 7
  AI 50-69%: 4
  No AI / AI < 50%: 0
  No AI configured: 5 (neutral — don't penalize absence)

SIGNAL 6: HISTORICAL PATTERN (0-10)
  Matches known recurring pattern: 10
  Similar to past transaction: 5
  Completely new: 0
```

#### Trust Score → UX Behavior

| Score | UX Treatment | Section 5 Mapping |
|-------|-------------|-------------------|
| 90-100 | Silent auto-classify, appears as confirmed | Learned or Confirmed state |
| 75-89 | Auto-classify with "Review" chip | Learned with indicator |
| 50-74 | Show as "Suggested: [category]" — user must confirm | Suggested state |
| 25-49 | Show raw, ask user to classify | Unclassified state |
| 0-24 | Show with warning: "Low confidence — please verify this is real" | Quarantined state |

### 5.3 Trigger Conditions

Computed once per detected transaction at detection time. Updated if:
- Corroboration arrives (second source for same transaction)
- AI classification completes (async, may arrive after initial scoring)
- User confirms/denies (moves to user_confirmed, bypasses trust score)

### 5.4 Failure Modes

| Failure | Cause | Impact |
|---------|-------|--------|
| High trust for fake transaction | Sophisticated spoof from known package name | Fake transaction auto-classified and counted |
| Low trust for real transaction | New bank app not in whitelist, or notification format changed | Real transaction quarantined or shown as suspicious |
| Trust inflation from corroboration | Same fake message arrives via SMS and notification | Corroboration bonus applied to fake |

### 5.5 Fallback Logic

| Failure | Fallback |
|---------|----------|
| Fake passes trust threshold | 5-layer fake defense (System 9) operates independently of trust scoring. Anomaly detection catches unusual patterns. User can always mark as fake → source trust reduced. 3+ fakes from same source → auto-blacklist. |
| Real transaction quarantined | User confirms as real → counted normally. Source trust not damaged. Over time, new template patterns added to recognize format. |
| Corroboration inflates fake | Layer 4 (SMS-specific): links in SMS → trust = 0 regardless. Layer 3 (anomaly): amount/time patterns still flag. |

### 5.6 Dependencies

- **System 1 (Detection)** — provides sender, template match, transaction proof data
- **System 3 (Intelligence)** — provides AI confidence signal
- **System 9 (Fake Defense)** — independent parallel check
- **Pattern memory** — provides historical pattern signal

### 5.7 Deferred Beyond v1

- Community trust signals (aggregate anonymized fake reports)
- Bank-specific trust calibration (different banks, different notification reliability)
- Trust score explanation visible to user (v1 shows "High/Medium/Low" — not the numeric score)

---

## SYSTEM 6: CREDIT CARD LEDGER

*Section 4 references: Section 9 (D3), M6*

### 6.1 Why It Exists

**Problems solved:** P1 (invisible spending — credit card creates delayed visibility), P4 (dirty data — double-counting is the most common credit card tracking error), P5 (credits side ignored — bill payments are settlements, not spending), P9 (data fragmentation — credit card is a different instrument with different cash flow timing)

Credit card spending breaks the simple "money left my bank = I spent money" model. When you swipe ₹5,000 at BigBazaar on your credit card, no money leaves your bank that day. A month later, when you pay ₹5,000 to your card bill, money leaves your bank — but you already spent it. Counting both events as spending = ₹10,000 reported vs ₹5,000 actual. The ledger exists to prevent this fundamental error.

### 6.2 How It Works

```
EACH CREDIT CARD = SEPARATE LIABILITY ACCOUNT

  Schema per card:
  {
    id, bank, card_name, last_4, type: "credit",
    billing_cycle_date, due_date_offset, credit_limit,
    known_bill_payee_patterns: ["HDFCBILL", "HDFC CREDIT CARD"],
    status: "active"
  }

TRANSACTION TYPES AND THEIR HANDLING:

  Card spend (swipe/tap/online/EMI):
    economic_type: genuine_spend
    liability_effect: creates_liability
    → Counted in spending totals
    → Outstanding balance increases
    → Categorized normally (food, shopping, etc.)

  Bill payment (full/partial/minimum):
    economic_type: credit_card_payment
    liability_effect: settles_liability
    → NOT counted in spending totals (M6)
    → Outstanding balance decreases
    → Linked to card's liability account

  Interest/late fee/annual fee:
    economic_type: fee_charge
    liability_effect: creates_liability
    → Outstanding increases
    → Shown as fee, not regular spending

  Cashback/reward credit:
    economic_type: cashback_reward
    liability_effect: reduces_liability
    → Outstanding decreases

  Refund to card:
    economic_type: refund
    liability_effect: reduces_liability
    → Outstanding decreases
    → Linked to original purchase if amount matches within 30 days

BILL PAYMENT MATCHING LOGIC:

  When bank debit notification arrives:
    IF payee matches known credit card bill payee pattern
       (e.g., "HDFCBILL", "ICICICRD", known card company names)
    OR amount matches last known statement balance / minimum due
    AND timing is near due date (+/- 7 days)
    THEN:
      → classify as credit_card_payment
      → liability_effect = settles_liability
      → link to card's liability account
      → reduce outstanding by payment amount
      → do NOT count as spending

RUPAY CREDIT ON UPI:
  Detected via UPI notification with credit card hint
  Looks like normal UPI debit but creates_liability
  economic_type: genuine_spend
  payment_instrument: rupay_credit_on_upi
  → Counted as spending AND increases card outstanding
```

### 6.3 Trigger Conditions

| Trigger | Action |
|---------|--------|
| Card spend notification detected | Create transaction with creates_liability, add to card outstanding |
| Bank debit matching bill payee pattern | Classify as credit_card_payment, settles_liability |
| Card app notification with statement/due date info | Update card's statement_balance, minimum_due, due_date |
| Due date approaching (7 days) | Show in Home pending actions (Section 5, 6.1) |
| User adds card manually | Create liability account |
| First time user has both card spend + bill payment | Show one-time educational card (Section 5, 6.2) |

### 6.4 Confidence Rules

- Bill payment matching requires: payee pattern match OR (amount match + timing match). Single signal alone is not enough — reduces false positive bill payment classification.
- RuPay Credit on UPI: if notification doesn't explicitly indicate credit card, treat as normal UPI spend. Only flag as creates_liability when credit card instrument is identifiable.
- Card discovery: auto-detected from card app notifications. Confidence depends on notification clarity. User confirmation preferred.

### 6.5 Failure Modes

| Failure | Cause | Impact |
|---------|-------|--------|
| Bill payment not recognized | Unknown payee pattern, amount doesn't match known balance | Bill payment counted as general spending → double-count |
| Card spend not linked to card | Notification doesn't contain card hint | Spend counted correctly but not tracked against card outstanding |
| Statement balance outdated | Statement notification missed or not sent | Due date alert may show wrong amount |
| RuPay credit on UPI classified as normal UPI | No credit card indicator in notification | Correct spending total, but liability tracking misses it |

### 6.6 Fallback Logic

| Failure | Fallback |
|---------|----------|
| Bill payment not recognized | User manually marks as "card payment" → payee added to known patterns for future. |
| Card spend not linked | Still counted as spending (correct). User can link to card in transaction detail. |
| Statement outdated | Outstanding shown as "Based on tracked transactions — may not include offline/international purchases." User can manually update. |
| RuPay credit misclassified | User corrects instrument to rupay_credit_on_upi → pattern learned. |

### 6.7 Dependencies

- **System 1 (Detection)** — card app notifications, bank debit notifications
- **System 2 (Transaction Model)** — liability_effect axis
- **Known bill payee pattern list** — updatable configuration
- **Local storage** — card ledger persists

### 6.8 Deferred Beyond v1

- Statement PDF import and reconciliation
- EMI schedule tracking (individual EMI vs lump card spend)
- Reward points tracking
- Credit utilization alerts
- Multi-statement-cycle view
- International transaction support

---

## SYSTEM 7: TRUST-RAMP PROGRESSION

*Section 4 references: Trust Ramp (Learning Phases), M5; Section 5 references: Section 8*

### 7.1 Why It Exists

**Problems solved:** P12 (mis-categorization — by gating features until the system is reliable enough), P15 (no financial education — insights only appear when data is trustworthy), P3 (lifestyle inflation — trends only meaningful after multiple cycles)

A freshly installed app with 3 transactions has no business showing "You spent 22% more on food this month." The trust ramp exists to prevent SpendSense from pretending to know things it doesn't — the core honesty principle from Section 5. Features unlock as evidence accumulates, not as calendar days pass.

### 7.2 How It Works

5 phases, each with evidence-based exit thresholds plus time soft floors/ceilings:

```
PHASE 1: BOOTSTRAP (brand new)
  Entry: App installed, permissions granted
  Exit (ALL must be true):
    - Time >= 3 days (soft floor)
    - Transactions detected >= 10
    - Transactions confirmed by user >= 5
    - Distinct merchants seen >= 3
  UX: All totals labeled "All estimated." Category breakdown HIDDEN.
      Insights HIDDEN. Earned income HIDDEN.
  Soft ceiling: 14 days → gentle prompt, NOT auto-advance

PHASE 2: BASELINE
  Exit (ALL must be true):
    - Time >= 14 days
    - Transactions confirmed >= 15
    - Distinct economic types confirmed >= 3
    - Learned-state accuracy >= 75%
    - Unresolved backlog ratio <= 50%
  UX: Confirmed/estimated split visible. Category breakdown appears
      (labeled "based on confirmed transactions"). Earned income shown
      if detected. Cycle comparison HIDDEN.
  Soft ceiling: 30 days → encouragement, NOT auto-advance

PHASE 3: LEARNING
  Exit (ALL must be true):
    - Complete spending cycles observed >= 1
    - Time >= 45 days
    - Transactions confirmed >= 40
    - Distinct merchants with learned patterns >= 8
    - Learned-state accuracy >= 80%
    - Salary pattern confidence >= 1 confirmed OR user marked "no fixed salary"
    - Unresolved backlog ratio <= 30%
  UX: Full category breakdown. Cycle comparison if previous cycle exists.
      First template-based insights. Earned income confirmed if salary
      verified. Pending actions smaller.
  Soft ceiling: 90 days → auto-advance with persistent caveat note

PHASE 4: MATURE
  Exit (ALL must be true):
    - Complete spending cycles >= 3
    - Time >= 150 days
    - Learned-state accuracy >= 85%
    - Unresolved backlog ratio <= 15%
  UX: Multi-cycle comparisons. Richer insights. Budget suggestions.

PHASE 5: DEEP INTELLIGENCE
  Entry: >= 180 days AND >= 6 complete cycles AND accuracy >= 85%
  UX: Same-month-last-year comparisons. Seasonal patterns.
      Predictive recommendations. Nearly zero pending items for
      regular merchants.
```

#### Regression Rules

| Condition | Regression |
|-----------|-----------|
| Accuracy drops below 65% for 2 consecutive weeks | Drop one phase |
| Backlog ratio exceeds 60% for 2 consecutive weeks | Drop one phase |
| User bulk-undoes auto-classifications | Drop to Baseline |
| User resets identity graph | Drop to Bootstrap |
| Notification access revoked > 7 days | Drop to Bootstrap |

### 7.3 Trigger Conditions

Phase evaluation runs:
- On every app open (check current metrics against thresholds)
- After every user classification action (may push metrics past threshold)
- On daily background job (check regression conditions)

Phase advancement is never silent — user sees a brief factual message in Settings:
```
"SpendSense accuracy: Learning → Mature
 Pattern accuracy: 86%
 42 merchants recognized"
```

### 7.4 Confidence Rules

The trust ramp itself doesn't assign confidence to transactions — it controls which UX features are visible. The key interaction:

- **Bootstrap phase:** Even high-confidence transactions show as "Estimated" because the system hasn't proven itself yet
- **Baseline phase:** Confirmed/Estimated split becomes visible — user can now see which transactions are trusted
- **Learning phase onward:** Category breakdowns and insights based on confirmed data

### 7.5 Failure Modes

| Failure | Cause | Impact |
|---------|-------|--------|
| User stuck in Bootstrap | Low transaction volume, doesn't confirm | Features stay gated, app feels limited |
| Phase regression feels punishing | Accuracy drop after bank changes notification format | User sees features disappear |
| Soft ceiling auto-advance premature | Low-volume user advanced by time ceiling without enough data | Features shown with insufficient evidence |

### 7.6 Fallback Logic

| Failure | Fallback |
|---------|----------|
| Stuck in Bootstrap | Soft ceiling at 14 days: gentle prompt with specific guidance ("Confirm 3 more transactions to unlock category view"). NOT auto-advanced. |
| Phase regression | Show factual message: "Your classification accuracy has changed. Some features are temporarily simplified." No blame, no guilt. |
| Premature auto-advance (Phase 3 ceiling at 90 days) | Persistent caveat note: "Based on limited data — confirm more transactions for better accuracy." |

### 7.7 Dependencies

- **System 3 (Intelligence)** — provides accuracy metrics
- **Pattern memory** — provides merchant coverage count
- **Transaction store** — provides confirmed/total counts
- **Cycle engine** — provides complete cycle count

### 7.8 Deferred Beyond v1

- Gamified progression (intentionally not gamified — factual only)
- Per-category trust ramp (different categories mature at different rates)
- Trust ramp sharing (prove reliability to new device)

---

## SYSTEM 8: PURPOSE-CAPTURE & PROMPT DELIVERY

*Section 4 references: Purpose Capture Decision Table, M8; Section 5 references: Section 7*

### 8.1 Why It Exists

**Problems solved:** P7 (context lost within hours — this system captures the "why" while the user still remembers), P14 (notification fatigue — the delivery model prevents over-prompting), P16 (no emotional connection — capturing purpose/beneficiary/occasion enables emotional context)

The user pays ₹500 to "Krishna Stores." Was it vegetables for the family (routine need) or a birthday cake for their sister (one-time occasion)? The transaction data alone cannot tell. Purpose capture exists to ask the user — but asking too much kills the app (P14). The delivery model exists to ask at the right time, in the right way, at the right frequency.

### 8.2 How It Works — Purpose Capture Logic

```
PURPOSE ASSIGNMENT LAYERS (same as intelligence tiers):

Layer 1 — Rule Engine (automatic):
  Known merchant → known purpose
  Examples:
    Zomato/Swiggy → food_social, counterparty: platform
    Jio/Airtel → telecom, intent: recurring_auto, recurrence: monthly
    Zerodha/Groww → financial, intent: investment

Layer 2 — Pattern Memory (automatic):
  Merchant + context → learned purpose
  Examples:
    "BigBazaar, 2000, Saturday" → food_daily (confirmed 3x by user)
    "500 to Mom monthly" → beneficiary: parents, intent: obligation

Layer 3 — AI-assisted (if available):
  Context-based inference
  Examples:
    "15000 to MAKEMYTRIP" → transport_travel, occasion: travel
    "3500 to DR SHARMA" → health, intent: need

Layer 4 — User input (for remaining):
  Quick picker shows most likely options based on amount/merchant/time
  User taps → stored as pattern for future

MULTI-PURPOSE MERCHANTS:
  Same merchant can have different purposes.
  Pattern memory stores MULTIPLE associations:
    Krishna Stores → [
      {purpose: "vegetables", count: 28, confidence: 0.92},
      {purpose: "birthday cake", count: 2, confidence: 0.15}
    ]
  Default suggestion: highest confidence ("vegetables")
  Alternative available as second choice
```

#### Purpose Capture Decision Table

| Amount | Merchant Known? | Confidence | User State | Action |
|--------|----------------|------------|-----------|--------|
| any | any | 95%+ (auto_high) | any | Silent auto-classify. No prompt. |
| any | familiar | 80-94% | any | Suggest + 1-tap confirm next app open |
| >₹10K | unknown | low | active | Ask within 2 min |
| >₹10K | unknown | low | inactive | Ask when screen turns on |
| ₹2K-10K | unknown | low | active | Ask within 5 min |
| ₹2K-10K | unknown | low | inactive | Ask when app next opened |
| ₹500-2K | unknown | low | active | Ask within 10 min |
| ₹500-2K | unknown | low | inactive | Batch — ask when app next opened |
| ₹100-500 | unknown | low | active | Queue — show in backlog |
| ₹100-500 | unknown | low | inactive | Queue — backlog |
| <₹100 | unknown | low | any | Queue — backlog. Low amount, don't interrupt. |
| any | any | low | busy (3+ in 10min) | NEVER interrupt. Batch all. |
| any | seen 1-2x | low-medium | any | Suggest based on last purpose + 1-tap |

**Critical rule:** amount < ₹500 and merchant unknown does NOT mean skip. It means "queue for later, don't interrupt now." It STILL gets captured.

### 8.3 How It Works — Prompt Delivery Model

```
on_transaction_detected(tx):

  STEP 1: Should we prompt at all?

  if tx.state == "Quarantined":
    → always prompt (safety-critical)
    → delivery: smart_notification (immediate)
    → skip all other logic

  if tx.state == "Learned" AND confidence >= 85%:
    → do NOT prompt — auto-classify silently
    → DONE

  if tx.state == "Suggested" AND confidence >= 70%:
    → do NOT prompt immediately
    → add to in-app queue + batch digest
    → DONE

  STEP 2: When do we prompt?

  if is_burst_mode() [3+ transactions in 5 minutes]:
    → do NOT prompt per-transaction
    → set burst timer = 10 min after last transaction
    → when timer fires: ONE batch prompt ("You had N transactions.
      Tap to review.")
    → DONE

  if quiet_hours() [11pm-7am]:
    → queue for morning batch digest (9am default)
    → DONE

  STEP 3: How do we prompt?

  if NOT spendsense_is_visible():
    // PRIMARY PATH — overwhelmingly common
    if floating_prompt_enabled AND overlay_permission_granted
       AND NOT fullscreen_app_active AND NOT user_in_call:
      → floating_prompt
    else if user_dismissal_rate < 40%:
      → smart_notification (default real-time surface)
    else:
      → batch_digest (user has shown they don't want per-tx prompts)

  if spendsense_is_visible():
    // SECONDARY PATH — rare during real-time
    → in_app_inline (card at top of current screen)
    → auto-dismisses after 15 seconds
    → do NOT also send notification (no double-prompt)

  STEP 4: Escalation / backlog management

  Unclassified after 24 hours: stays in in-app queue + next batch digest
  Unclassified after 7 days: move to "backlog" in Txns, remove from
    Home pending count
  Unclassified after 30 days: one final prompt — "Classify now or
    archive as uncategorized?"
    → Archive: counted in spending as "Uncategorized"
    → The money DID leave. We just don't know why.
```

#### Unclassified Transaction Aging (aligned with locked Section 5, 7.3)

```
Unclassified after 24 hours:
  → no re-prompt
  → stays in in-app queue
  → included in next batch digest (if enabled)

Unclassified after 7 days:
  → move to "backlog" in Txns tab
  → no longer shown in Home pending count
  → still accessible via Txns filter: "Backlog"
  → still NOT counted in confirmed totals

Unclassified after 30 days:
  → one final batch prompt:
    "You have [N] old transactions that were never classified.
     Classify now or archive as uncategorized?"
  → [Classify] opens batch flow
  → [Archive] → marked "Uncategorized" permanently
  → counted in spending total as "Uncategorized"
    (the money DID leave — we just don't know the purpose)
```

#### Rate Caps

| Surface | Cap |
|---------|-----|
| Smart notification | Max 3/hour, max 8/day |
| Floating prompt | Max 5/hour; if 3 dismissed in a row → switch to notification for session |
| Batch digest | Once daily (reduce to weekly if 5 consecutive ignored; stop if 3 weekly ignored) |

### 8.4 Trigger Conditions

| Trigger | Action |
|---------|--------|
| Transaction detected with confidence < auto-classify threshold | Enter purpose capture flow |
| User opens app with pending unclassified items | Show pending count in Home + Txns |
| 9am (or user-configured time) with unclassified backlog | Send batch digest |
| 30 days since unclassified transaction created | Final archive prompt |

### 8.5 Failure Modes

| Failure | Cause | Impact |
|---------|-------|--------|
| User overwhelmed by prompts | Too many transactions in short time, caps not effective enough | User disables notifications → loses all real-time capture |
| Context lost despite prompting | User dismisses, forgets by the time they open app | Purpose unknown, transaction is "Uncategorized" |
| Floating prompt blocked | Overlay permission denied, fullscreen app, phone call | Falls through to smart notification |
| Smart notification not delivered | Android battery optimization kills notification channel | Prompt never reaches user |
| Batch digest ignored repeatedly | User doesn't care about classification | System degrades to in-app-only, user classifies (or doesn't) when they open the app |

### 8.6 Fallback Logic

Every delivery surface has a fallback:
```
floating_prompt fails → smart_notification
smart_notification dismissed repeatedly → batch_digest
batch_digest ignored repeatedly → in_app_only
in_app_only ignored → backlog → 30-day archive as "Uncategorized"
```

Nothing is lost. The transaction is always stored. Only the purpose remains unknown.

### 8.7 Dependencies

- **System 1 (Detection)** — triggers the prompt flow
- **System 3 (Intelligence)** — determines initial confidence (whether to prompt at all)
- **System 11 (Reason Ontology)** — provides the categories shown in prompt buttons
- **Android notification system** — for smart notifications
- **Android overlay permission** — for floating prompts (opt-in)
- **System 7 (Trust Ramp)** — Bootstrap phase means more prompts; Mature means fewer

### 8.8 Deferred Beyond v1

- Conversational classification ("Tell me what this was for" → natural language)
- Photo receipt attachment
- Location-based auto-classification
- Time-based smart scheduling (learn when user is most responsive)

---

## SYSTEM 9: 5-LAYER FAKE ALERT DEFENSE

*Section 4 references: Fake Alert Defense, M10*

### 9.1 Why It Exists

**Problems solved:** P4 (dirty data — fake transactions are the worst kind of dirty data), P8 (privacy/trust fear — if a fake ₹49,999 shows up in the app, user loses all trust instantly), P12 (mis-categorization — fake alerts must never be classified as real)

v1 experience (documented in learnings): promotional SMS saying "Your Friends & Family And Save Rs100" was parsed as a ₹33 debit. Gmail notifications about payment emails were captured as separate transactions. "Autopay mandate" creation SMS triggered as successful payment because it contained "successfully." These are not theoretical risks — they are proven failure modes.

### 9.2 How It Works

```
5 LAYERS (applied sequentially, any layer can quarantine or reject):

LAYER 1: SOURCE FILTERING
  Only process notifications from whitelisted packages
  Unknown package → trust capped at 40, flagged for review
  User can add custom packages with "unverified source" flag

  Logic:
    if package NOT in whitelist:
      if user_added_as_custom:
        trust_cap = 40
        flag = "unverified_source"
      else:
        DISCARD — not processed at all

LAYER 2: TEMPLATE VALIDATION
  If notification text doesn't match ANY known template for that sender:
    trust capped at 40, flagged for review

  Known templates per bank/app:
    SBI: "Your A/c XX...XXXX is debited for Rs.{amount}..."
    HDFC: "Rs {amount} debited from a/c **{last4}..."
    GPay: "Paid {amount} to {merchant}..."
    [etc. — maintained as updatable pattern library]

  Logic:
    if sender in whitelist BUT text doesn't match templates:
      trust_cap = 40
      flag = "unknown_template"

LAYER 3: ANOMALY DETECTION
  Statistical checks against user's transaction history:
    - Amount > 2x user's largest known transaction → FLAG
    - Transaction at 2-4 AM from unknown merchant → FLAG
    - Burst of 5+ transactions in 1 minute → FLAG
    - Amount = 1 rupee or 0 (phishing patterns) → FLAG for review

  Flags add to quarantine consideration but don't reject outright.
  Multiple flags from different layers → stronger quarantine signal.

LAYER 4: SMS-SPECIFIC (Sideload only)
  Bank sender shortcode verification:
    Sender must match known bank shortcode database
  Link detection:
    SMS containing ANY URL → automatic trust score = 0, flag as phishing
  Phishing phrase detection:
    "click here", "update KYC", "verify now", "link your",
    "act immediately" → auto-reject, notify user

  This is the strongest defense layer. SMS with links = ALWAYS quarantined.

LAYER 5: USER REPORTING
  Any transaction can be flagged "This is fake/spam" by user
  Source gets trust reduction
  3+ user flags from same source → auto-blacklist source
  User feedback loop improves all other layers over time

CRITICAL RULE (M10):
  AI is NEVER allowed to "promote" a low-trust message (score < 40)
  into normal flow. AI can only affect the score by +/- 10 points.
  This prevents an AI hallucination from overriding structural
  evidence of fakeness.
```

### 9.3 Trigger Conditions

| Trigger | Layers Applied |
|---------|---------------|
| Notification from whitelisted app | Layer 1 (pass) → Layer 2 → Layer 3 |
| Notification from unknown app | Layer 1 (cap at 40) → Layer 2 → Layer 3 |
| SMS from known shortcode (sideload) | Layer 1 (pass) → Layer 2 → Layer 3 → Layer 4 |
| SMS from unknown sender (sideload) | Layer 1 (cap at 40) → Layer 2 → Layer 3 → Layer 4 |
| User taps "This is fake/spam" | Layer 5 applied retroactively |

### 9.4 Confidence Rules

- Layer 1 + Layer 2 both fail (unknown source, unknown template): trust capped at 40 → goes to quarantine
- Layer 4 detects link: trust = 0 → quarantined as phishing, regardless of all other signals
- Multiple Layer 3 anomaly flags: additive quarantine signal
- AI contribution to trust: capped at ±10 points. A trust-20 message cannot become trust-30 from AI alone — still quarantined.

### 9.5 Failure Modes

| Failure | Cause | Impact |
|---------|-------|--------|
| Sophisticated spoof passes all layers | Uses real bank package name, matches template, normal amount | Fake transaction enters normal flow |
| Real transaction quarantined | New bank format, unusual amount for new user | User must manually confirm |
| Bank changes notification format | Template library outdated | All notifications from that bank flagged as unknown_template |
| False blacklist | User accidentally marks real transactions as fake 3x from same source | Source auto-blacklisted, future real transactions missed |

### 9.6 Fallback Logic

| Failure | Fallback |
|---------|----------|
| Spoof passes layers | Quarantine UX (Section 5) gives user final say. User marks fake → source trust reduced. Pattern informs future detection. |
| Real transaction quarantined | User confirms as real → enters normal flow. Template library updated to handle new format. |
| Bank format change | Whitelist is updatable config. App update can ship new templates. Until then, transactions show with review flag. |
| False blacklist | User can un-blacklist source in Settings → Notification Sources. |

### 9.7 Dependencies

- **Package whitelist** — Layer 1
- **Template library** — Layer 2
- **Transaction history** — Layer 3 (anomaly baselines)
- **SMS shortcode database** — Layer 4 (sideload)
- **User feedback mechanism** — Layer 5

### 9.8 Deferred Beyond v1

- Community-sourced fake alert patterns
- Real-time threat intelligence feeds
- Machine learning on fake patterns (requires training data)
- Bank notification format versioning (auto-detect format changes)

---

## SYSTEM 10: CYCLE ENGINE & SALARY DETECTION

*Section 4 references: F6*

### 10.1 Why It Exists

**Problems solved:** P1 (invisible spending — cycle framing answers "where did THIS month's money go"), P3 (lifestyle inflation — cycle-over-cycle comparison reveals creep), P6 (generic budgets — budget anchored to YOUR salary date, not calendar month)

Most Indians don't think in calendar months. Salary arrives on the 26th. Spending happens from the 26th to the 25th. A "March" report that starts on the 1st splits one pay period across two months. The cycle engine exists to align the app's view with how users actually experience money.

### 10.2 How It Works

```
SALARY DETECTION — 5-Signal Confidence Model

  Signal 1: Date recurrence (weight: 30%)
    Credit arrives on same date (+/- 2 days) for 2+ months

  Signal 2: Amount band recurrence (weight: 25%)
    Amount within +/- 10% of previous month

  Signal 3: Narration pattern (weight: 20%)
    SMS/notification contains: "salary", "sal cr", "payroll",
    known employer name

  Signal 4: Source consistency (weight: 15%)
    Always from same sender/account

  Signal 5: Past user confirmation (weight: 10%)
    User previously confirmed "this is my salary"

CONFIDENCE UX:
  High (>80%): "Your salary of ₹X has been credited — same date and
    amount as last month. Starting new cycle." [Confirm] [Not my salary]
  Medium (50-79%): "₹X was credited. This looks like it could be regular
    income. Is this your salary?" [Yes] [No] [Tell us more]
  Low (<50%): "₹X was credited. What is this?"
    [Salary] [Freelance] [Transfer] [Refund] [Other]

CYCLE ANCHORING:
  After salary confirmed for 2+ months:
    → Anchor cycle start to salary date
    → Example: salary on 26th → cycle = 26th to 25th
  If no salary detected:
    → Default to calendar month (1st to last)
  User can manually set cycle date in Settings

MID-CYCLE INSTALL:
  First cycle is partial, clearly labeled:
    "Partial cycle: Mar 15 - Mar 25 (11 days)"
  No cycle comparison until first FULL cycle completes
```

### 10.3 Trigger Conditions

| Trigger | Action |
|---------|--------|
| Inflow detected (any amount) | Evaluate against 5-signal salary model (date recurrence, amount band, narration, source consistency, past confirmation) |
| 2nd month with matching salary pattern | Offer to anchor cycle |
| User sets cycle date in Settings | Override auto-detection |
| Cycle boundary reached | Roll totals, start new cycle, enable comparison if previous cycle exists |

### 10.4 Failure Modes

| Failure | Cause | Impact |
|---------|-------|--------|
| Non-salary classified as salary | Recurring refund or investment return matches date+amount+source patterns over 2+ months | Cycle anchored to wrong date |
| Variable salary not detected | Freelancer with different amounts each month | Salary signal too weak for auto-detection |
| Salary date shifts | Company changes payroll date | Cycle boundary moves, partial cycle created |

### 10.5 Fallback Logic

| Failure | Fallback |
|---------|----------|
| Non-salary as salary | User corrects ("Not my salary") → salary confidence for that pattern resets. Cycle re-evaluates. |
| Variable salary | User manually marks each salary. Or selects "No fixed salary" → calendar month default. |
| Salary date shifts | New date detected after 2 months of new pattern. Old cycle transitions gracefully with one partial cycle. |

### 10.6 Dependencies

- **System 1 (Detection)** — detects the inflow
- **System 3 (Intelligence)** — narration pattern analysis
- **System 7 (Trust Ramp)** — Phase 3 requires salary pattern confidence

### 10.7 Deferred Beyond v1

- Multiple salary sources (freelancer with 3 clients)
- Irregular income cycle support (weekly pay, bi-weekly)
- Salary prediction ("Your salary is 2 days late")

---

## SYSTEM 11: 6-DIMENSION REASON ONTOLOGY

*Section 4 references: Section 11 (I1-I6), M8*

### 11.1 Why It Exists

**Problems solved:** P6 (generic budgets — reason ontology enables personal categorization), P15 (financial education — "22% on food" becomes "22% on food, 73% benefits household, 27% personal"), P16 (emotional connection — gift to sister ≠ electricity bill, even if same amount)

Competitors track category. SpendSense tracks meaning. "₹2,000 to Amazon" is shopping. But was it a book for yourself (personal, want) or a birthday gift for your mother (family_obligation, occasion: birthday)? The 6-dimension model captures this context. Over time, it becomes a competitive moat — no other app knows this about the user.

### 11.2 How It Works

```
6 DIMENSIONS PER TRANSACTION:

  1. life_area (where in life): 22 values
     food_daily, food_social, housing, transport_daily, transport_travel,
     health, education, entertainment, clothing, personal_care, technology,
     family_obligation, social_obligation, children, pets, financial,
     telecom, utilities, government, charity, vice, miscellaneous

  2. counterparty_type (who is on the other side): 11 values
     large_retailer, small_merchant, online_marketplace, service_provider,
     institution, friend, family, self, employer, platform, unknown

  3. intent (why initiated): 8 values
     need, want, obligation, impulse, investment, maintenance, emergency,
     recurring_auto

  4. recurrence: 7 values
     one_time, daily, weekly, monthly, quarterly, annual, irregular_recurring

  5. beneficiary (who benefits): 9 values
     self, spouse, children, parents, extended_family, friend, household,
     community, business

  6. occasion (what triggered): 11 values
     routine, festival, birthday, wedding, travel, health_event,
     celebration, emergency, season, sale, none

ASSIGNMENT PROCESS (same 4-layer intelligence):
  Layer 1 (Rule): Known merchants → known dimensions
  Layer 2 (Pattern): Learned from 3+ user confirmations
  Layer 3 (AI): Inferred from context
  Layer 4 (User): Quick-picker with most likely options

13 DEFAULT BASKETS derived from life_area groupings:
  Daily Essentials, Food & Dining, Housing, Transport, Bills & Utilities,
  Health, Shopping, Entertainment, Subscriptions, Family & Gifts,
  Finance & EMI, Education (dynamic), Miscellaneous

BASKET RULES:
  - Dynamic creation: 3+ transactions that don't fit any default → create
  - Maximum: 20 baskets (hard limit)
  - If 21st would be needed → AI suggests merging two least-used
  - Auto-merge suggestion when any basket < 2% of total transactions
```

### 11.3 Trigger Conditions

Reason dimensions are assigned at the same time as classification (System 3). The user prompt (if needed) asks both category and purpose in one flow, not two separate interactions.

### 11.4 Confidence Rules

- life_area and counterparty_type: assigned by rule engine for known merchants with high confidence
- intent, beneficiary, occasion: harder to auto-detect. Often require user input or AI inference.
- Pattern memory stores all 6 dimensions per merchant-purpose pair
- AI can infer dimensions but user always has final say

### 11.5 Failure Modes

Same merchant can have different purposes (I6). Pattern memory handles this by storing MULTIPLE associations per merchant with individual confidence scores.

### 11.6 Dependencies

- **System 3 (Intelligence)** — performs the assignment
- **Known merchant database** — seeds initial life_area mappings
- **Pattern memory** — stores multi-purpose associations

### 11.7 Deferred Beyond v1

- Social/community insights ("Your friend group averages ₹X on dining")
- Household-level reason tracking
- Life-stage evolution tracking (student → professional → parent)
- Cultural calendar integration (auto-tag festival spending)

---

## SYSTEM 12: CASH WALLET

*Section 4 references: Section 10 (H1-H4), F12, M7*

### 12.1 Why It Exists

**Problems solved:** P9 (data fragmentation — cash is a blind spot), P13 (connectivity gaps — cash is the ultimate offline payment)

Cash withdrawals are detectable (ATM SMS/notification). But what happens after the cash leaves the ATM is invisible to any automated system. The cash wallet bridges this gap — optionally, lightly, without ever nagging.

### 12.2 How It Works

```
CASH ENTERS THE SYSTEM:
  ATM withdrawal detected (via notification/SMS)
  → Auto-create cash wallet entry with withdrawal amount
  → Gentle prompt: "₹X cash withdrawn. Want to track how you spend it?"
    [Yes, remind me] / [No thanks] / [Later]

  "Later" → prompt again after 24 hours, then stop
  "No thanks" → cash_withdrawal recorded as cash-out, no further tracking
  "Yes" → cash wallet activated for this withdrawal

CASH SPENDING LOGGING (if tracking enabled):
  Dashboard shows: "Cash in hand: ₹X"
  Quick-log button: "Spent cash"
    → Amount (number pad, quick picks: ₹50, ₹100, ₹200, ₹500)
    → What for? (quick picker from common categories)
    → Done
  3 taps maximum (M7)
  Cash balance auto-decrements
  If balance reaches 0 → stop showing tracker until next withdrawal

IF USER NEVER LOGS:
  After 7 days: "You withdrew ₹X cash. Want to log where it went,
    or mark it all as 'General cash spending'?"
  "Mark all as general" → single entry, closes tracking for this withdrawal
  NEVER auto-classified. NEVER silently enters spend dashboard.

RULES (M7):
  - Per-withdrawal tracking, not a running total
  - Multiple withdrawals = multiple trackable cash blocks
  - Cash deposits detected via notification → recorded as cash_deposit
  - Cash received from others = manual entry only
  - No alerts, no nagging, no guilt — it's optional
```

### 12.3 Trigger Conditions

| Trigger | Action |
|---------|--------|
| ATM withdrawal detected | Create cash wallet entry, offer tracking |
| User taps "Spent cash" | Deduct from cash balance, create cash spend transaction |
| Cash balance reaches 0 | Hide tracker for that withdrawal |
| 7 days with no logging | One-time "log or mark as general" prompt |
| Cash deposit detected | Record as cash_deposit inflow |

### 12.4 Failure Modes

| Failure | Cause | Impact |
|---------|-------|--------|
| ATM withdrawal not detected | Notification missed, SMS delayed | Cash wallet never created for that withdrawal |
| User forgets to log cash spends | Friction too high, or just forgets | Cash balance stays high, inaccurate |
| Cash received not tracked | Cannot auto-detect cash received | Under-reports cash inflow |

### 12.5 Fallback Logic

| Failure | Fallback |
|---------|----------|
| Withdrawal not detected | User can manually add cash to wallet |
| User doesn't log | 7-day prompt. If ignored, cash block stays as "untracked." Honest: "₹X cash withdrawn, spending not tracked." |
| Cash received | Manual entry only. Honest blind spot. |

### 12.6 Dependencies

- **System 1 (Detection)** — detects ATM withdrawal notification/SMS
- **System 2 (Transaction Model)** — cash_withdrawal and cash_deposit economic types

### 12.7 Deferred Beyond v1

- Cash envelope system (assign cash to categories at withdrawal time)
- Cash reconciliation ("You said you had ₹500 left but withdrew ₹2,000 more")
- Cash spending prediction from patterns

---

## SYSTEM 13: BUDGET SYSTEM

*Section 4 references: F8*

### 13.1 Why It Exists

**Problems solved:** P1 (invisible spending — budget creates a frame of reference), P3 (lifestyle inflation — budget alerts when spending exceeds expectations), P6 (generic budgets — anchored to user's cycle and patterns)

Phase 1 budgets are "awareness budgets" — not prescriptive ("you must spend ₹X on food") but informational ("you've used 75% of your budget with 12 days left"). The goal is visibility, not restriction.

### 13.2 How It Works

```
BUDGET TYPES:
  Overall monthly limit (one number, e.g., ₹30,000)
  Per-category budgets (optional, e.g., Food: ₹8,000)

PROGRESS TRACKING:
  Visual: progress bar per budget
  Burn rate: current spending pace vs days remaining
  Projection: "At this rate, you'll spend ₹35,000 by end of cycle"

ALERTS:
  At 50%: subtle indicator (color shift on progress bar)
  At 75%: in-app card: "You've used 75% of your budget with [N] days left"
  At 90%: notification: "Budget almost reached"
  At 100%: notification: "You've reached your monthly budget"

  Max 3 budget alerts per cycle (Section 5, unchanged notification
  philosophy). No repeated nagging.

BUDGET + CYCLE INTEGRATION:
  Budget period = spending cycle (salary date to salary date)
  Partial first cycle → budget pro-rated
  Budget suggestions appear in Phase 4 (Mature) based on historical patterns
```

### 13.3 Trigger Conditions

| Trigger | Action |
|---------|--------|
| User sets budget | Create budget with amount and optional per-category splits |
| Transaction classified as spending | Update budget progress |
| Budget threshold crossed (50/75/90/100%) | Show appropriate alert |
| Cycle boundary | Reset budget progress for new cycle |
| Phase 4 (Mature) reached | Offer budget suggestions based on 3+ cycle average |

### 13.4 Failure Modes

| Failure | Cause | Impact |
|---------|-------|--------|
| Budget inaccurate due to unclassified transactions | Many transactions pending | Progress bar understates actual spending |
| Budget not useful during Bootstrap | Not enough data to know what's realistic | User sets unrealistic number |

### 13.5 Fallback Logic

| Failure | Fallback |
|---------|----------|
| Unclassified transactions | Progress bar shows "Confirmed" portion solid, "Estimated" portion lighter, "Unclassified" not counted but pending count shown |
| Bootstrap phase | Budget available but Section 5 hides category breakdown. Simple total-only progress bar. |

### 13.6 Dependencies

- **System 2 (Transaction Model)** — only spending economic_types count toward budget
- **System 10 (Cycle Engine)** — budget period = cycle
- **System 7 (Trust Ramp)** — budget suggestions only in Phase 4+

### 13.7 Deferred Beyond v1

- Zero-based budgeting methodology
- Rollover budgets (unspent amount carries to next cycle)
- Budget sharing (household budgets)
- Savings goal tracking
- AI-powered budget optimization

---

## SYSTEM 14: DUPLICATE DETECTION

*Section 4 references: D2 (Duplicate Detection table)*

### 14.1 Why It Exists

**Problems solved:** P4 (dirty data — v1 experience: same payment detected 4 times from bank SMS + Paytm notification + Gmail email)

One UPI payment can trigger a bank app notification, a UPI app notification, a bank SMS, and a Gmail email notification about the bank's email. Without dedup, the user sees 4 "transactions" for one payment.

### 14.2 How It Works

```
FINGERPRINT: amount (+/- ₹1) + flow direction + time window

SCENARIO-SPECIFIC RULES:

  SMS + Notification for same payment:
    Same amount +/- ₹1 + same flow + within 30 minutes → MERGE
    Keep higher-trust source as primary, other as corroboration

  Two SMS for same payment (different banks):
    Same amount + same UPI reference → MERGE

  Notification + Notification (different apps):
    Same amount + within 5 minutes → MERGE
    (GPay notification + bank notification for same payment)

  Failed + Success for same attempt:
    Same amount + same merchant + within 1 hour + one has failure marker
    → Keep success only, discard failed

  Mandate creation + Mandate execution:
    Different events: mandate_setup is DISCARDED (no money moved)
    mandate_execution is TRACKED (money moved)
```

### 14.3 Trigger Conditions

Runs on every newly detected transaction before it enters the main store.

### 14.4 Failure Modes

| Failure | Cause | Impact |
|---------|-------|--------|
| False merge | Two genuinely different transactions of same amount within 30 min | One transaction lost |
| Missed duplicate | Time window too narrow, amount slightly different | Duplicate counted |

### 14.5 Fallback Logic

| Failure | Fallback |
|---------|----------|
| False merge | User sees one transaction instead of two. If they notice, manual entry adds the missing one. UPI reference (if available) helps distinguish — different refs = different transactions. |
| Missed duplicate | User can delete duplicate manually. Pattern feeds into dedup calibration. |

### 14.6 Dependencies

- **System 1 (Detection)** — provides raw transactions
- **Transaction store** — historical fingerprints for matching

### 14.7 Deferred Beyond v1

- UPI reference-based definitive matching (when available)
- Cross-day dedup (rare but possible with delayed SMS)
- Smart merge UI (show potential duplicates for user decision)

---

## SYSTEM 15: EXPORT

*Section 4 references: F11*

### 15.1 Why It Exists

**Problems solved:** P8 (privacy — user owns their data, must be able to take it out)

Export exists because user data ownership is a core principle. The user should never feel locked in.

### 15.2 How It Works

```
FORMAT: CSV with all 6 axes
FILTERS: Date range, category, economic_type
CONTENT: All classified transactions with full metadata
OUTPUT: File saved to device storage, shareable via Android share sheet
```

### 15.3 Deferred Beyond v1

- PDF report generation
- Google Sheets integration
- Tally/accounting software format
- Scheduled auto-export

---

## CROSS-SYSTEM DEPENDENCY MAP

```
                    ┌──────────────┐
                    │   System 1   │
                    │  Detection   │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────────┐
              │            │                │
              v            v                v
        ┌──────────┐ ┌──────────┐    ┌──────────┐
        │ System 9 │ │ System 5 │    │ System 4 │
        │  Fake    │ │  Trust   │    │ Identity │
        │ Defense  │ │ Scoring  │    │  Graph   │
        └────┬─────┘ └────┬─────┘    └────┬─────┘
             │            │               │
             v            v               v
        ┌─────────────────────────────────────┐
        │           System 2                   │
        │     6-Axis Transaction Model         │
        └──────────────┬──────────────────────┘
                       │
              ┌────────┼────────┐
              │        │        │
              v        v        v
        ┌────────┐ ┌────────┐ ┌────────┐
        │Sys 3   │ │Sys 6   │ │Sys 14  │
        │Intelli-│ │Credit  │ │Dedup   │
        │gence   │ │Card    │ │        │
        └───┬────┘ └────────┘ └────────┘
            │
     ┌──────┼──────┬──────────┐
     │      │      │          │
     v      v      v          v
  ┌─────┐┌─────┐┌─────┐ ┌────────┐
  │Sys 8││Sys  ││Sys  │ │Sys 10  │
  │Purp-││11   ││7    │ │Cycle   │
  │ose  ││Onto-││Trust│ │Engine  │
  │Captu││logy ││Ramp │ │        │
  └─────┘└─────┘└─────┘ └────────┘
                            │
                            v
                       ┌────────┐
                       │Sys 13  │
                       │Budget  │
                       └────────┘

  Sys 12 (Cash Wallet) ← System 1 (Detection)
  Sys 15 (Export) ← All transaction data
```

---

## LOCKED DECISIONS THIS SECTION REINFORCES

Every system above operates within the frozen logic M1-M10. Key reinforcements:

- **M1:** Detection is distribution-dependent. Every detection-related system has a Play Store path and a Sideload path.
- **M2:** The 6-axis model is the canonical structure. No system stores or displays transactions without all 6 axes.
- **M3:** Every system works without AI. AI enhances; it never gates.
- **M4:** Self-identity graph is consulted by detection, classification, and dashboard routing.
- **M5:** Trust score gates UX treatment. No bypass.
- **M6:** Credit card double-count prevention is absolute. The ledger system enforces it.
- **M7:** Cash wallet is optional, per-withdrawal, 3-tap max, never nags.
- **M8:** 6-dimension reason ontology captures meaning, not just category.
- **M9:** AI payloads are defined per use case. Nothing extra leaves the device.
- **M10:** Fake defense's 5 layers and the AI trust cap (±10 points) are non-negotiable.
