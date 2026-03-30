# SECTION 4 — FEATURES AND MONEY LOGIC

> **Status:** LOCKED
> **Locked on:** 2026-03-27
> **Recovery status:** Reconstructed from iterative locked conversation history
> **Confidence:** High
> **Note:** This document merges multiple accepted iterations of Section 4. When earlier and later versions conflicted, the later accepted correction was treated as authoritative.

---

## 1. Section Objective

Define the complete feature specification for SpendSense v1, grounded in a mature money model rather than a feature list. Every feature must solve at least one of the 16 locked problems (Section 2), beat at least one competitor gap (Section 3), and contribute to at least one of the 6 moat components. The rule for every feature: if it doesn't do all three, we don't build it.

---

## 2. Frozen Facts from Research

Only claims that survive primary-source scrutiny. Everything else is in Section 3.

### A1. Google Play SMS/Call Log Policy (source: Google Play Policy Center, published text)

- READ_SMS and CALL_LOG are restricted permissions under Google Play's "Permissions and APIs that Access Sensitive Information" policy
- The published policy identifies permitted use cases: default SMS handler, default phone handler, default assistant handler
- The policy also documents a temporary exception path -- apps may request a one-time temporary exception via the Permissions Declaration Form if they can demonstrate a core function requiring access and no alternative method exists
- Financial tracking is not listed as a named permitted use case, but the temporary exception path is not categorically closed to any app type in the published text
- **Architecture conclusion:** Play-safe v1 should not rely on READ_SMS. The exception path exists but is not reliably grantable, and building a core product dependency on a temporary exception is an unacceptable risk for a zero-budget app with no NBFC license or institutional backing.

### A2. NotificationListenerService -- Android Platform Behavior (source: Android developer documentation)

- Apps granted notification access by the user receive all posted notifications system-wide via `onNotificationPosted()`
- The permission survives app restarts but can be revoked by the user at any time via Settings -> Notification Access
- On Android 13+, notification posting requires POST_NOTIFICATIONS permission, but listening to other apps' notifications only requires the user-granted notification access toggle
- NotificationListenerService cannot be enabled or bound on low-RAM devices running Android Q (API 29) and below -- this is a platform-level restriction, not degraded behavior (see Section 13.5)

### A3. UPI Transaction Scale (source: NPCI monthly press releases)

- 86% of UPI transactions are <=500 rupees (NPCI published data)
- 16.6 billion+ UPI transactions/month as of late 2024 (NPCI published data)
- NPCI publishes total volume and value monthly; NPCI does NOT publish category-level breakdowns in its monthly reports

### A4. Indian Money Behavior (source: published surveys, cited individually)

- 59.8% of UPI users acknowledge overspending after UPI adoption (Razorpay FY2024 survey)
- 74.2% report increased spending frequency (Razorpay FY2024 survey)
- Average Indian household has 2.3 bank accounts (RBI Financial Inclusion data)
- Credit-on-UPI (RuPay) growing rapidly -- exact QoQ rate varies by reporting period (NPCI/RBI payment system reports)

### A5. FinArt as Market Precedent (source: Google Play Store public listing)

- FinArt (10K+ installs) is a live Play Store expense tracking app whose public listing describes automation based on transaction SMS and app notifications
- This confirms that Google Play's current enforcement permits at least some expense-tracking apps that use automated transaction detection to remain listed
- This does NOT prove which specific permission (NotificationListenerService, SMS exception, or other mechanism) FinArt uses, nor does it prove that any particular permission is itself the basis for Play Store approval
- **What A5 supports:** It is possible to ship an automated expense tracker on Play Store today. The market is not categorically blocked.
- **What A5 does not support:** That NotificationListenerService alone is sufficient for approval, or that SpendSense's specific permission set will be approved. Play Store review outcomes remain non-public and case-by-case.

### A6. High-Confidence Inferences (strong market signals, not primary-source proven)

| Inference | Basis | Confidence | What Would Confirm It |
|-----------|-------|------------|----------------------|
| Walnut/Axio retains READ_SMS because of RBI NBFC registration | Axio is RBI-registered NBFC (public); they still have SMS access on Play Store | High | Axio's Permissions Declaration Form approval (non-public) |
| Non-NBFC consumer finance apps face very high rejection rates for READ_SMS | Bluecoins (1M+ installs) does not have SMS access; no known non-NBFC tracker has it | High | Google's internal approval statistics (non-public) |
| Google Pay sends parseable outgoing-payment notifications on most Android devices | Widely reported by developers; GPay is Google's own app with standard notification practices | High | Field testing across 5+ device OEMs (T1) |
| Bank transaction notifications (SBI, HDFC, ICICI, Kotak, Axis) arrive within seconds and contain amount + merchant/VPA | Standard banking practice; widely observed | High | Field testing with real accounts (T1) |
| DND mode does not suppress NotificationListenerService access | Listener operates at system level via NotificationManager, architecturally separate from notification shade and DND filtering; multiple developer sources confirm | High | Field test T13 |

### A7. Market Observations (directional signals, not freezable as ground truth)

| Observation | Source | Limitation |
|-------------|--------|-----------|
| PhonePe sends outgoing-payment confirmation notifications | User reports, developer observations | Not officially documented; behavior may vary by version/OEM/settings; needs field testing (T1b) |
| Paytm sends outgoing-payment confirmation notifications | User reports, developer observations | Same limitations; Paytm has changed notification behavior across versions (T1c) |
| Groceries/kirana represent ~30% of small-value UPI transactions | PhonePe Pulse data, industry analyst reports | Provider-specific dataset, not NPCI national data; directional signal |
| Top UPI spend categories: groceries, food delivery, telecom, fuel, utilities | PhonePe Pulse, Razorpay FY reports | Aggregated from provider-specific data; directional, not exact national shares |
| Credit-on-UPI growing 30-40%+ QoQ | NPCI/RBI payment system data, press coverage | Growth rate varies by reporting period; directional trend is clear |

---

## 3. Assumptions / Field-Testing Items

| ID | Assumption | Source Tier | How to Test | Impact if Wrong |
|----|-----------|-------------|-------------|-----------------|
| T1 | GPay notifications contain merchant name + amount in parseable format across OEMs | High-confidence inference | Capture 50+ real notifications across 5 banks x 3 OEMs | If merchant missing -> "Unknown merchant" + ask user |
| T1b | PhonePe outgoing-payment notifications contain parseable transaction data | Market observation | Capture 30+ PhonePe notifications across versions/OEMs | If absent -> PhonePe outgoing payments rely on bank notification only |
| T1c | Paytm outgoing-payment notifications contain parseable transaction data | Market observation | Capture 30+ Paytm notifications across versions/OEMs | Same as T1b |
| T2 | NotificationListenerService survives battery optimization on Samsung/Xiaomi/Realme | Hypothesis | 72-hour soak test per OEM, no user interaction | If killed -> need AutoStart permission guidance + foreground service |
| T3 | Bank SMS format is stable enough for regex parsing (sideload) | High-confidence inference | Collect 200+ SMS across SBI/HDFC/ICICI/Kotak/Axis | If unstable -> SMS becomes secondary corroboration only |
| T4 | Users will grant notification access when explained clearly | Hypothesis | A/B test onboarding with 20 beta users | If <60% grant -> redesign onboarding |
| T5 | Dual-SIM users receive notifications from both SIMs | Unknown | Test on Xiaomi/Samsung dual-SIM | If missed -> known blind spot for second SIM |
| T6 | UPI Lite transactions generate notifications | Unknown | Test with SBI/ICICI UPI Lite | If silent -> known blind spot, disclose to user |
| T7 | Fake/spam bank SMS reliably distinguishable | High-confidence inference | Collect 50+ fake SMS samples | If unreliable -> raise trust thresholds |
| T8 | Self-transfer detection works across 90%+ VPA formats | Hypothesis | Collect VPA patterns from 20+ users | If <90% -> expand identity graph heuristics |
| T9 | Gemini Flash free tier handles 500+ classifications/month | Testable | Load test with synthetic batch | If throttled -> reduce AI calls, expand rules |
| T10 | NotificationListenerService functions correctly in Android work profiles | Unknown | Test on device with work profile enabled | If blocked -> work profile is unsupported scenario |
| T11 | Foreground service is required for listener reliability on aggressive OEMs | Hypothesis | Compare listener survival with/without foreground service across OEMs | Determines whether persistent notification is needed |
| T12 | NotificationListenerService rebinds correctly after being killed/restarted by system | Platform-documented but OEM-variable | Test across OEMs after force-stop, reboot, battery kill | If rebind fails -> need watchdog or user guidance |
| T13 | DND mode does not suppress NotificationListenerService callbacks | High-confidence inference | Enable DND, trigger bank transaction, verify listener fires | If suppressed -> must inform user or guide to DND exception |
| T14 | Low-RAM devices on Android R+ allow NotificationListenerService binding | Unknown | Test on Android Go / low-RAM device running Android 11+ | If blocked -> expand unsupported scenario to all low-RAM devices |

**Freeze rule:** Any assumption that fails testing gets a degraded-but-functional fallback. No feature depends on a single assumption being true.

---

## 4. Architecture Decisions

### C1. Dual Distribution Architecture

```
PLAY STORE VERSION
  Primary: NotificationListenerService
  Secondary: Manual entry
  Tertiary: User-pasted SMS (optional)
  NO READ_SMS permission requested
  Policy-safe, updatable via Play Store

SIDELOAD VERSION
  Primary: READ_SMS + BroadcastReceiver
  Secondary: NotificationListenerService
  Tertiary: Manual entry
  Full SMS access, richer parsing
  Distributed via website APK download
```

Shared codebase: One React Native project, build flavor flag (`DISTRIBUTION=playstore|sideload`) controls which permissions are requested and which detection pipeline is primary.

### C2. Detection Pipeline (Play Store)

```
Notification arrives
  -> NotificationListenerService captures
  -> Package filter (whitelist: bank apps, UPI apps)
  -> Template matcher (bank-specific regex)
  -> Extract: amount, merchant/VPA, account_hint, timestamp
  -> Duplicate check (amount + timestamp + source within 2min window)
  -> Trust score calculation
  -> If trust >= 80: auto-classify with confidence tag
  -> If trust 50-79: suggest classification, ask user
  -> If trust < 50: show raw, ask user to confirm/discard
  -> Store transaction with full provenance
```

### C3. Detection Pipeline (Sideload)

```
SMS arrives via BroadcastReceiver
  -> Sender filter (bank shortcodes, known senders)
  -> Full SMS parser (regex extraction)
  -> Extract: amount, merchant/VPA, account_hint, balance, UPI_ref, timestamp
  -> Cross-check with any notification for same transaction
  -> If both sources agree: trust = max(sms_trust, notif_trust) + 10 (corroboration bonus)
  -> Same classification flow as above
```

### C4. AI Provider Abstraction

```
AI CAPABILITY LAYER

  +-----------+  +-----------+  +------------+
  | Rule      |  | Pattern   |  | AI         |
  | Engine    |  | Memory    |  | Provider   |
  | (always)  |  | (always)  |  | (optional) |
  +-----------+  +-----------+  +------------+

  AI Provider Interface:
  +-- None (pure rule + pattern mode)
  +-- User API Key (Gemini/OpenAI/Claude)
  +-- App-managed (future, when revenue)
  +-- On-device (future, when models shrink)

  Every AI call returns:
  { result, confidence, provider, model,
    tokens_used, latency_ms, cost_estimate }
```

---

## 5. Money Model

### D1. The 6-Axis Transaction Model

Every transaction in SpendSense has exactly 6 axes:

**AXIS 1: STATUS (lifecycle state)**

`success | failed | pending | reversed | refunded | disputed | expired`

**AXIS 2: FLOW (direction of money)**

`outflow | inflow | internal`

**AXIS 3: ECONOMIC TYPE (what kind of money movement)**

| Economic Type | Direction | Counts As |
|--------------|-----------|-----------|
| genuine_spend | outflow | SPENDING |
| bill_payment | outflow | SPENDING |
| subscription | outflow | SPENDING (recurring) |
| insurance_premium | outflow | SPENDING |
| fee_charge | outflow | SPENDING (bank charges, late fees, penalties) |
| government_payment | outflow | SPENDING (shown separately in insights) |
| gift_given | outflow | SPENDING (shown with emotional context) |
| charity_donation | outflow | SPENDING |
| group_split_paid | outflow | SPENDING |
| self_transfer | internal | NOT SPENDING (hidden from spend) |
| investment_out | outflow | NOT SPENDING (asset conversion) |
| lent_out | outflow | NOT SPENDING (receivable, expected to return) |
| loan_repayment_out | outflow | NOT SPENDING (debt reduction) |
| credit_card_payment | outflow | NOT SPENDING (liability settlement) |
| emi_payment | outflow | NOT SPENDING (liability settlement) |
| cash_withdrawal | outflow | CASH-OUT (tracked as "cash in hand") |
| cash_deposit | inflow | CASH-IN (returning cash to account) |
| salary_credit | inflow | TRUE INCOME |
| secondary_income | inflow | TRUE INCOME (freelance, rental, interest) |
| reimbursement | inflow | TRUE INCOME (expense recovery) |
| gift_received | inflow | NON-INCOME CREDIT (shown separately) |
| cashback_reward | inflow | NON-INCOME CREDIT |
| refund | inflow | NON-INCOME CREDIT (reduces net spend) |
| investment_return | inflow | NOT INCOME (asset redemption) |
| borrowed_in | inflow | LIABILITY (NOT income -- must be repaid) |
| loan_recovery_in | inflow | RECEIVABLE CLEARED |
| group_split_received | inflow | NON-INCOME CREDIT |
| government_receipt | inflow | NON-INCOME CREDIT (tax refund, subsidy) |
| insurance_claim | inflow | NON-INCOME CREDIT |
| deposit_return | inflow | NON-INCOME CREDIT |
| unclassified | either | NOT COUNTED until classified |

**AXIS 4: PAYMENT INSTRUMENT**

| Instrument | Description |
|-----------|-------------|
| bank_account | Direct debit/credit from savings/current |
| credit_card | Visa/MC/RuPay credit card |
| rupay_credit_on_upi | RuPay credit card linked to UPI |
| debit_card | Card-based debit (non-UPI) |
| upi | Standard UPI from bank account |
| upi_lite | UPI Lite (on-device wallet, <=500 rupees) |
| wallet | Paytm/Amazon Pay/PhonePe wallet |
| cash | Physical currency |
| neft_rtgs_imps | Bank transfer protocols |
| auto_debit | Standing instruction / mandate |
| unknown | Instrument not identifiable |

**AXIS 5: LIABILITY EFFECT**

| Effect | Meaning |
|--------|---------|
| creates_liability | Credit card spend, loan taken, EMI purchase |
| settles_liability | Credit card bill payment, loan EMI payment |
| reduces_receivable | Someone repays money they owed you |
| increases_receivable | You lend money to someone |
| none | Normal spend/income, no liability change |

**AXIS 6: CONFIDENCE**

| Level | Range | Meaning |
|-------|-------|---------|
| auto_high | 95-100% | Rule-matched, corroborated, or previously user-confirmed pattern |
| auto_medium | 80-94% | Single source, pattern-matched |
| suggested | 50-79% | AI or weak pattern, shown to user |
| uncertain | 0-49% | Needs user input before classification |
| user_confirmed | N/A | User explicitly set/corrected this |
| user_override | N/A | User changed an auto-classification |

### D2. Decision Tables

**Status Detection:**

| Signal | Status |
|--------|--------|
| Contains "failed"/"failure"/"unsuccessful"/"declined"/"rejected"/"cbs rejection" | failed |
| Contains "pending"/"processing"/"initiated" AND no success keyword | pending |
| Contains "reversed"/"reversal" | reversed |
| Contains "refund"/"refunded" | refunded |
| Contains "disputed"/"chargeback" | disputed |
| Contains "expired" | expired |
| Contains "success"/"successful"/"credited"/"debited"/"paid"/"received"/"sent" AND no failure keyword | success |
| Failure keyword + success keyword in same message | failed (failure takes priority) |

**Flow Detection:**

| Signal | Flow |
|--------|------|
| "debited"/"sent"/"paid"/"purchased"/"charged" | outflow |
| "credited"/"received"/"deposited" | inflow |
| Both sender and receiver in self-identity graph | internal |
| "transferred" + receiver in self-identity graph | internal |
| "transferred" + receiver NOT in self-identity graph | outflow |

**Economic Type Detection (priority order):**

```
1. User override exists -> use user's classification
2. Pattern memory match (>=3 confirmations, same merchant) -> use pattern
3. Rule-based detection:
   a. Self-identity match on both sides -> self_transfer
   b. Salary markers (time-of-month + amount + employer pattern) -> salary_credit
   c. ATM withdrawal keywords -> cash_withdrawal
   d. Credit card bill payment keywords -> credit_card_payment
   e. EMI keywords -> emi_payment
   f. Known investment platform (Zerodha/Groww/MF Central) -> investment_out/return
   g. Known subscription (Netflix/Spotify/Jio) -> subscription
   h. Known utility (electricity/gas/water board) -> bill_payment
   i. Government payment keywords (challan/tax/fine) -> government_payment
4. AI classification (if available) -> AI-suggested type with confidence
5. Amount + time heuristics:
   a. <=500 to food merchant -> genuine_spend
   b. Round amount to known contact -> lent_out or gift_given (ask user)
6. Fallback -> unclassified (prompt user)
```

**What enters each dashboard:**

| Dashboard | Includes | Excludes |
|-----------|----------|----------|
| Spend | genuine_spend, bill_payment, fee_charge, government_payment, gift_given, charity_donation, subscription, insurance_premium, group_split_paid | investment_out, self_transfer, loan_repayment_out, credit_card_payment, emi_payment, cash_withdrawal, lent_out |
| True Income | salary_credit, secondary_income, reimbursement | gift_received, cashback_reward, refund, borrowed_in, investment_return |
| Net Cash Flow | All success outflows minus all success inflows | failed, pending, reversed |
| Savings Rate | (True Income minus Spend) / True Income x 100 | Everything else |
| Investment Flow | investment_out, investment_return | Everything else |
| Debt/Receivable | borrowed_in, lent_out, loan_repayment_out, loan_recovery_in | Everything else |
| Cash Position | cash_withdrawal (as "cash in hand, untracked") | -- |

**Duplicate Detection (cross-source):**

| Scenario | Detection Logic |
|----------|----------------|
| SMS + Notification for same payment | Same amount +/- 1 rupee + same flow + within 30 minutes -> merge |
| Two SMS for same payment (different banks) | Same amount + same UPI ref -> merge |
| Notification + Notification (different apps) | Same amount + within 5 minutes -> merge |
| Failed + Success for same attempt | Same amount + same merchant + within 1 hour + one has failure marker -> keep success only |
| Mandate creation + Mandate execution | Different: mandate_setup is discarded, mandate_execution is tracked |

---

## 6. Source Architecture

### SMS Reader (Sideload only)

| Property | Reality |
|----------|---------|
| Speed | Near-instant (1-5 seconds) |
| Reliability | HIGH for bank debits/credits (RBI-mandated) |
| Coverage | All bank transactions that generate SMS; does NOT cover wallet-only, UPI Lite, deleted SMS |
| Privacy risk | MEDIUM -- reads all SMS, must filter aggressively |
| Google Play risk | HIGH -- restricted permission |
| Failure modes | SMS deleted before read; SMS delayed by network; RCS not readable; dual-SIM on non-monitored SIM; unknown bank sender ID |
| Suitable for real-time prompting | YES |

**SMS Parsing: Hybrid Model**

- **Layer A -- Rule Engine (first pass):** Hardcoded regex patterns for known bank SMS formats. Extracts amount, account number, UPI ref, balance, merchant/VPA. Detects failure/promotional phrases. Speed: <1ms per SMS. Accuracy: ~85% on well-formatted bank SMS. Role: gatekeeper.
- **Layer B -- AI Classification (second pass, only when rule engine confidence <80%):** Input: sanitized SMS text (account numbers masked, phone numbers masked). Output: structured JSON with confidence score. Fallback: rule engine result. Role: arbiter for ambiguous cases.
- **Layer C -- User Confirmation (third pass, only when combined confidence <70%):** Transaction stored with status needs_review. Shown in backlog. Role: safety net.

**Source of truth when they disagree:**
- Rule engine says failed with high confidence -> TRUST RULE ENGINE
- Rule engine says debit but AI says not a transaction -> TRUST AI
- Both agree -> auto-classify
- Both disagree and both low confidence -> send to user review

### Notification Listener (Play Store primary)

| Property | Reality |
|----------|---------|
| Speed | Instant (notification = event fires) |
| Reliability | VARIABLE by app (see A6, A7) |
| Privacy risk | LOW-MEDIUM -- reads notification text from whitelisted apps only |
| Google Play risk | MEDIUM -- requires user consent, less restricted than SMS |
| Failure modes | User disables access; OEM kills service; app doesn't send notification; notification truncated |
| Suitable for real-time prompting | YES -- fastest source |

**Package Whitelist (maintainable configuration, not frozen constants):**

```
Bank apps:
  com.sbi.lotusintouch (SBI YONO)
  com.csam.icici.bank.imobile (ICICI iMobile)
  com.snapwork.hdfc (HDFC Mobile Banking)
  com.msf.kbank.mobile (Kotak)
  com.axis.mobile (Axis)
  [expandable per user's banks]

UPI apps:
  com.google.android.apps.nbu.paisa.user (Google Pay India)
  com.phonepe.app (PhonePe)
  net.one97.paytm (Paytm)
  in.org.npci.upiapp (BHIM)

Credit card apps:
  com.hdfcbank.payzapp (HDFC PayZapp)
  com.sbicard.app (SBI Card)
  [expandable]
```

Whitelist stored as updatable JSON config, not compiled constants. User can add custom packages with "unverified source" trust flag. App updates can ship whitelist additions without code changes.

### Manual Entry

| Property | Reality |
|----------|---------|
| Speed | User-initiated |
| Reliability | HIGH (user entered it) |
| Coverage | Anything -- cash, foreign, offline |
| Privacy risk | NONE |

### Account Aggregator (AA) -- FUTURE, NOT v1

- T+1 or delayed; VERY HIGH reliability; RBI-regulated consent framework
- v1 decision: NOT included. Future roadmap for reconciliation.

### Bank Statement Import -- FUTURE, NOT v1

- Manual upload, batch processing; format varies by bank; PDF parsing fragile

---

## 7. Self-Identity Graph

The self-identity graph answers: "Is this transaction between the user and someone else, or between the user and themselves?"

### E1. Architecture

```
SELF-IDENTITY GRAPH

  Known Identities (confirmed):
    +-- VPA: charan@oksbi
    +-- VPA: charan.kumar@ybl
    +-- VPA: 9876543210@paytm
    +-- Account: SBI xx4523
    +-- Account: HDFC xx8901
    +-- Card: HDFC CC xx2345
    +-- Wallet: Paytm (9876543210)
    +-- Phone: 9876543210

  Suspected Identities (pending):
    +-- VPA: kumar.c@ibl (seen in transfer matching own account, ask user)
    +-- Account: ICICI xx6789 (salary credit source, likely own -- ask user)

  Confidence per identity:
    +-- user_declared: 100%
    +-- onboarding_entered: 100%
    +-- self_transfer_detected: 85%
    +-- salary_deposit_target: 80%
    +-- name_match_in_vpa: 60% (ask user)
```

### E2. Identity Discovery Methods

**Method 1: Onboarding Declaration**
- User enters primary phone number and optionally bank names
- Phone -> auto-derive common VPA patterns: {phone}@ybl, {phone}@paytm, {phone}@ibl, {phone}@axl
- User confirms which are theirs

**Method 2: Transaction Pattern Detection**
```
When outflow detected to VPA/account X:
  AND inflow of same amount detected within 5 minutes
  AND inflow source matches VPA/account X
  -> Flag as suspected self-transfer
  -> If this happens 2+ times with same X:
    -> Ask user: "Is [X] your own account?"
    -> If yes: add to identity graph as confirmed
    -> If no: mark as frequent_recipient, never ask again
```

**Method 3: Name-in-VPA Matching**
- If user's declared name contains "charan" AND a VPA contains "charan" (e.g., charan.k@oksbi):
  -> Flag as suspected_own_vpa (confidence: 60%)
  -> Do NOT auto-classify as self-transfer
  -> Ask user on first occurrence

**Method 4: Account Hint Accumulation**
- Every notification says "from A/c xx4523" or "to A/c xx8901"
- Build set of account_hints seen in OWN transactions
- After 5+ transactions from same hint -> confirmed as user's own
- When a TRANSFER targets a known own-account hint -> high confidence self-transfer

### E3. Self-Transfer Detection Decision Table

| Source Account | Destination Account | Both in Graph? | Classification |
|---------------|--------------------|--------------|--------------|
| Own (confirmed) | Own (confirmed) | Yes | self_transfer (auto, 95%+) |
| Own (confirmed) | Suspected own | Partial | self_transfer (suggested, 75%, ask) |
| Own (confirmed) | Unknown | No | outflow (normal classification) |
| Suspected own | Own (confirmed) | Partial | self_transfer (suggested, 75%, ask) |
| Unknown | Own (confirmed) | Partial | inflow (normal classification) |

### E4. Storage Schema

```
identity_graph: {
  phone_numbers: ["9876543210"],
  vpas: [
    { id: "charan@oksbi", status: "confirmed", source: "onboarding" },
    { id: "9876543210@ybl", status: "confirmed", source: "auto_derived" },
    { id: "kumar.c@ibl", status: "suspected", source: "transfer_pattern", occurrences: 2 }
  ],
  account_hints: [
    { hint: "xx4523", bank: "SBI", status: "confirmed", txn_count: 47 },
    { hint: "xx8901", bank: "HDFC", status: "confirmed", txn_count: 23 }
  ],
  cards: [
    { hint: "xx2345", bank: "HDFC", type: "credit", status: "confirmed" }
  ],
  wallets: [
    { provider: "paytm", phone: "9876543210", status: "confirmed" }
  ]
}
```

### E5. Deletion

When user taps "Delete all data," the entire identity graph is permanently deleted along with all other data. The app returns to fresh-install state.

---

## 8. AI Capability Layer

### F1. The Three Intelligence Tiers

**Tier 1: Rule Engine (always active, zero AI dependency)**

Handles: status detection, flow detection, amount extraction, merchant extraction, self-transfer detection, known merchant classification, duplicate detection, promotional/spam filtering, account hint extraction, UPI reference extraction.

Coverage estimate: 60-70% of transactions classified without any AI.

**Tier 2: Pattern Memory (always active, learns from user)**

Handles: merchant -> category mapping (after 3 user confirmations), time-of-day patterns, amount-range patterns, recurring transaction detection, salary detection.

Coverage estimate: additional 15-20% of transactions classified from learned patterns.

**Tier 3: AI Provider (optional, provider-agnostic)**

Handles: ambiguous merchant classification, purpose inference from context, natural language reason extraction, spending insight generation, anomaly explanation.

### F2. AI-Absent Mode (Complete Specification)

When user has no AI provider configured, SpendSense operates at Tier 1 + Tier 2 only.

**What works identically:**
- All transaction detection (notification/SMS capture)
- Amount, merchant, status, flow extraction
- Self-transfer detection
- Duplicate filtering
- Promotional filtering
- Known merchant auto-classification (hardcoded map of 200+ Indian merchants)
- Pattern-based auto-classification (after learning period)
- All financial calculations (totals, averages, burn rate)
- All cycle/budget tracking
- Export functionality
- Credit card ledger tracking

**What degrades gracefully:**

| Feature | With AI | Without AI |
|---------|---------|------------|
| Unknown merchant classification | AI suggests category | Shows "Unclassified" + asks user |
| Purpose tagging | AI infers purpose | Rule-based if obvious, else asks user |
| Spending insights | AI-generated natural language | Template-based: "You spent X% more on [category] than last cycle" |
| Anomaly detection | AI explains anomaly | Simple threshold: "This is 3x your usual [category] spend" |
| Smart search | Natural language queries | Keyword + filter based search |
| Initial categorization speed | ~85% auto on day 1 (target) | ~60% auto on day 1, improves to ~80% by month 2 (target) |

**What is unavailable without AI:**
- Free-form natural language insights
- Complex multi-factor spending analysis
- Predictive forecasting beyond simple trend lines
- Conversational budget advice

**UI Changes in No-AI Mode:**
- Settings shows: "AI Classification: Not configured. SpendSense uses rules and your past choices to classify transactions."
- No AI-related loading spinners or "thinking" states
- Classification prompts are more frequent in first 2 weeks
- After 30 days of user training, classification accuracy approaches AI-assisted levels for recurring merchants

### F3. AI Provider Interface

```
AIProvider {
  classify(transaction): Promise<{
    economic_type, life_area, confidence, reasoning, tokens_used, latency_ms
  }>
  generateInsight(data): Promise<{
    insight, confidence, tokens_used, latency_ms
  }>
  isAvailable(): Promise<boolean>
  getUsageStats(): { total_calls, total_tokens, estimated_cost }
}
```

Supported providers (Phase 1): GeminiFlashProvider, NoneProvider (returns confidence: 0 for everything).

Future: OpenAIProvider, ClaudeProvider, OnDeviceProvider.

### F4. AI Call Budget and Throttling

```
Daily AI call budget (Gemini free tier):
  Max 15 requests per minute
  Max 1,500 requests per day (conservative)
  Each transaction classification = ~1 request (~200 tokens)

Priority queue:
  1. User-initiated "classify this" (immediate)
  2. High-amount unclassified (>1000 rupees)
  3. Batch classification of day's unclassified (background, 2x daily)
  4. Insight generation (once daily, evening)

If quota exceeded:
  Queue remaining for next window
  Never block transaction capture
  Show "Classification pending" status
```

### F5. AI Privacy -- Exact Payloads Per Use Case

**Use Case 1: Transaction Classification**

SENT to AI:
- amount: exact number (e.g., 450)
- currency: "INR" (always)
- merchant_name: extracted name (e.g., "ZOMATO", "DMart")
- merchant_vpa_local: only the name part of VPA (e.g., "zomato" from zomato@paytm) -- NEVER the full VPA with handle
- flow: "outflow" / "inflow"
- instrument: "upi" / "credit_card" / etc.
- time_context: day_of_week + time_bucket (morning/afternoon/evening/night) -- NEVER exact timestamp
- user_history_summary: "user usually classifies this merchant as [X]" if pattern exists -- NEVER raw transaction history

NEVER SENT: raw notification text, account numbers or hints, VPA handles, phone numbers, UPI reference numbers, bank names, balance information, user's name or identity.

Fallback without AI: Rule engine + pattern memory. Works without AI: Yes.

**Use Case 2: Purpose Inference**

SENT: Same fields as transaction classification, plus category already assigned (if any), plus amount_relative ("typical" / "higher_than_usual" / "lower_than_usual").

NEVER SENT: same exclusions as above.

Fallback without AI: Purpose assigned by rule engine for known categories; "Unclassified" for unknown; user asked to tag manually. Works without AI: Yes.

**Use Case 3: Insight Generation**

SENT: Aggregated category totals for period, category deltas vs previous period, number of transactions per category, budget utilization percentage if set.

NEVER SENT: Individual transaction details, merchant names, any raw notification text, account/identity information, specific amounts of individual transactions.

Fallback without AI: Template-based insights. Works without AI: Yes.

**Use Case 4: Anomaly Explanation**

SENT: Anomaly description ("spending in [category] is [X]x usual"), category average for past 3 cycles, current cycle total, number of transactions in anomaly period.

NEVER SENT: Individual transactions, merchant names, any raw data.

Fallback without AI: Simple threshold alert. Works without AI: Yes.

---

## 9. Credit-Card Ledger

### D3. Credit Card as Liability Account

Each credit card is a separate liability account:

```
Card: HDFC Regalia ending 4523

  Current outstanding: 23,450
  Statement balance: 18,200
  Minimum due: 1,820
  Due date: April 5
  Available limit: 2,76,550

  This cycle spends:
    +-- Groceries: 4,200
    +-- Dining: 2,800
    +-- Amazon: 6,450
    +-- Fuel: 3,000

  Unbilled: 5,250
  Interest accrued: 0 (paid full last month)
```

### Credit Card Transaction Types

| Event | economic_type | flow | liability_effect | How Detected |
|-------|--------------|------|-----------------|--------------|
| Swipe/tap at merchant | genuine_spend | outflow | creates_liability | Card txn notification |
| Online purchase | genuine_spend | outflow | creates_liability | Card txn notification |
| EMI purchase | genuine_spend | outflow | creates_liability | EMI keyword |
| Bill payment (full) | credit_card_payment | outflow (from bank) | settles_liability | Bank debit matching card |
| Bill payment (partial) | credit_card_payment | outflow (from bank) | settles_liability (partial) | Same, amount < statement |
| Bill payment (minimum) | credit_card_payment | outflow (from bank) | settles_liability (partial) | Same, amount = minimum due |
| Interest charge | fee_charge | -- | creates_liability | Card statement notification |
| Late fee | fee_charge | -- | creates_liability | Card statement notification |
| Annual fee | fee_charge | -- | creates_liability | Card statement notification |
| Cashback/reward credit | cashback_reward | -- | reduces_liability | Card statement notification |
| Refund to card | refund | -- | reduces_liability | Card refund notification |
| RuPay credit on UPI | genuine_spend | outflow | creates_liability | UPI notification with credit card hint |

### Bill Payment Matching Logic

```
When bank debit notification arrives:
  -> If payee matches known credit card bill payee pattern
    (e.g., "HDFCBILL", "ICICICRD", credit card company names)
  -> OR amount matches last known statement balance / minimum due
  -> AND timing is near due date (+/-7 days)
  -> THEN: classify as credit_card_payment, settles_liability
  -> Link to the card's liability account
  -> Reduce outstanding by payment amount
  -> Do NOT double-count as spending
```

### The Double-Count Prevention Rule (FROZEN)

When you spend 5,000 on a credit card at BigBazaar, SpendSense records ONE spending event (economic_type: genuine_spend, instrument: credit_card, liability_effect: creates_liability). When you later pay 5,000 to your credit card bill, SpendSense records ONE liability settlement (economic_type: credit_card_payment, instrument: bank_account, liability_effect: settles_liability). Your total spending is 5,000, not 10,000. The bill payment is NOT counted in spending summaries.

### Multi-Card Support

```
credit_cards: [
  {
    id: "hdfc_regalia_2345",
    bank: "HDFC",
    card_name: "Regalia",
    last_4: "2345",
    type: "credit",
    billing_cycle_date: 1,
    due_date_offset: 20,
    credit_limit: 300000,
    known_bill_payee_patterns: ["HDFCBILL", "HDFC CREDIT CARD"],
    status: "active"
  }
]
```

Cards are discovered automatically (card app notification) or added manually.

---

## 10. Cash Wallet

Design principle: make cash tracking optional but rewarding, never annoying.

### H1. How Cash Enters the System

ATM withdrawal detected:
- Auto-create cash wallet entry
- Show gentle prompt: "X cash withdrawn. Want to track how you spend it?"
- User can: "Yes, remind me" / "No thanks" / "Later" (prompt again after 24 hours, then stop)

### H2. Cash Spending Logging

If tracking enabled:
- Dashboard shows: "Cash in hand: X"
- Quick-log button: "Spent cash" -> Amount (number pad, quick picks) -> What for? -> Done.
- 3 taps maximum
- Cash balance auto-decrements
- If balance reaches 0, stop showing tracker until next withdrawal

### H3. If User Never Logs Cash

- After 7 days: "You withdrew X cash. Want to log where it went, or mark it all as 'General cash spending'?"
- "Mark all as general" -> single entry, closes tracking for this withdrawal
- NEVER auto-classified. NEVER silently enters spend dashboard.

### H4. Cash Wallet Rules

- Per-withdrawal, not a running total (avoids complex reconciliation)
- Multiple withdrawals = multiple trackable cash blocks
- Cash deposits detected via notification and recorded as cash_deposit
- Cash received from others = manual entry only
- No alerts, no nagging, no guilt -- it's optional

---

## 11. Why-People-Pay Ontology

### I1. The 6-Dimension Reason Model

**DIMENSION 1: life_area** (where in life does this fit?)

food_daily, food_social, housing, transport_daily, transport_travel, health, education, entertainment, clothing, personal_care, technology, family_obligation, social_obligation, children, pets, financial, telecom, utilities, government, charity, vice, miscellaneous

**DIMENSION 2: counterparty_type** (who is on the other side?)

large_retailer, small_merchant, online_marketplace, service_provider, institution, friend, family, self, employer, platform, unknown

**DIMENSION 3: intent** (why did you initiate this?)

need, want, obligation, impulse, investment, maintenance, emergency, recurring_auto

**DIMENSION 4: recurrence**

one_time, daily, weekly, monthly, quarterly, annual, irregular_recurring

**DIMENSION 5: beneficiary** (who benefits?)

self, spouse, children, parents, extended_family, friend, household, community, business

**DIMENSION 6: occasion** (what triggered this?)

routine, festival, birthday, wedding, travel, health_event, celebration, emergency, season, sale, none

### I2. How Reasons Get Assigned

```
Layer 1 (Automatic - Rule Engine):
  Zomato/Swiggy -> food_social, counterparty: platform
  Jio/Airtel -> telecom, intent: recurring_auto, recurrence: monthly
  Zerodha/Groww -> financial, intent: investment

Layer 2 (Automatic - Pattern Memory):
  "BigBazaar, 2000, Saturday" -> food_daily (user confirmed 3x)
  "500 to Mom monthly" -> beneficiary: parents, intent: obligation

Layer 3 (AI-assisted, if available):
  "15000 to MAKEMYTRIP" -> transport_travel, occasion: travel
  "3500 to DR SHARMA" -> health, intent: need

Layer 4 (User input for remaining):
  Quick picker shows most likely options
  User taps one -> stored as pattern
```

### I3. The Indian Money Movement Map (20 Clusters)

| # | Cluster | Estimated Share (directional) | Key Merchants | SpendSense life_area |
|---|---------|------------------------------|---------------|---------------------|
| 1 | Daily groceries & kirana | ~25-30% | DMart, BigBazaar, local kirana | food_daily |
| 2 | Food delivery & dining | ~10-12% | Zomato, Swiggy, restaurants | food_social |
| 3 | Mobile & broadband recharge | ~6-8% | Jio, Airtel, Vi, BSNL | telecom |
| 4 | Fuel & commute | ~5-7% | HP, BPCL, IOC, Ola, Uber | transport_daily |
| 5 | Utility bills | ~4-6% | Electricity boards, gas, water | utilities |
| 6 | Online shopping | ~5-7% | Amazon, Flipkart, Myntra | varies by item |
| 7 | Person-to-person transfers | ~7-10% | Friends, family VPAs | varies |
| 8 | Self-transfers | ~4-6% | Own accounts | self_transfer |
| 9 | Medical & pharmacy | ~2-4% | Apollo, 1mg, hospitals | health |
| 10 | Education & coaching | ~1-3% | Schools, Unacademy | education |
| 11 | Entertainment & OTT | ~1-2% | Netflix, Hotstar, PVR | entertainment |
| 12 | Fashion & personal care | ~1-3% | Myntra, Nykaa, salons | clothing, personal_care |
| 13 | Rent & housing | ~1-3% | Landlord VPAs, NoBroker | housing |
| 14 | Insurance & EMI | ~1-2% | LIC, HDFC Life, Bajaj | financial |
| 15 | Investment flows | ~1-2% | Zerodha, Groww, MF Central | financial |
| 16 | Government payments | ~0.5-1% | Tax, challan, registration | government |
| 17 | Travel & hotels | ~0.5-1% | MakeMyTrip, IRCTC | transport_travel |
| 18 | Religious & charity | ~0.3-0.5% | Temples, NGOs | charity |
| 19 | Subscriptions & SaaS | ~0.3-0.5% | Spotify, YouTube Premium | entertainment |
| 20 | Miscellaneous services | ~1-2% | Local services, freelancers | varies |

**Source note:** Share estimates are directional ranges derived from PhonePe Pulse, Razorpay FY reports, and industry analysis. These are provider-specific datasets and industry approximations, NOT NPCI national statistics. NPCI monthly reports publish total UPI volume and value but do not provide category-level breakdowns.

### I4. Why This Is a Moat

- No competitor tracks intent/beneficiary/occasion -- they only track category
- Pattern memory compounds -- after 3 months, SpendSense knows "500 to Raju every Tuesday = weekly vegetable guy, beneficiary: household, intent: need"
- Indian-specific ontology -- "family_obligation" and "social_obligation" don't exist in Western finance apps but account for 15-20% of Indian spending
- Enables unique insights: "You spent 12,000 on social obligations this wedding season" / "Your impulse spending is 3x higher on weekends" / "73% of your food spending benefits the household, 27% is personal"
- Data compounds over time -- switching cost grows every month

### I5. Default Baskets (13)

| # | Basket | Life Area | Universal? |
|---|--------|-----------|-----------|
| 1 | Daily Essentials | daily_living | Yes |
| 2 | Food & Dining | food_dining | Yes |
| 3 | Housing | housing | Yes |
| 4 | Transport | transport | Yes |
| 5 | Bills & Utilities | utilities | Yes |
| 6 | Health | health | Yes |
| 7 | Shopping | personal_care + misc | Yes |
| 8 | Entertainment | entertainment | Yes |
| 9 | Subscriptions | entertainment/utilities (recurring) | Yes |
| 10 | Family & Gifts | family + social | Yes (Indian culture) |
| 11 | Finance & EMI | finance | Yes |
| 12 | Education | education | Dynamic -- only if detected |
| 13 | Miscellaneous | uncategorized | Yes (honest catch-all) |

Dynamic basket creation rules:
- Created only when 3+ transactions fall into a pattern that doesn't fit any default
- Maximum 20 baskets total (hard limit)
- If 21st would be created, AI suggests merging two least-used
- System suggests merge when any basket has <2% of total transactions

### I6. Handling Same Merchant, Different Meaning

```
Example: 500 to "Krishna Stores"
  Time 1: User says "vegetables" -> food_daily + need + routine
  Time 2: User says "birthday cake" -> food_social + obligation + one_time

Solution: Purpose Memory stores MULTIPLE purpose associations per merchant.
  Krishna Stores -> [
    {purpose: "vegetables", count: 28, confidence: 0.92},
    {purpose: "birthday cake", count: 2, confidence: 0.15}
  ]
  Default suggestion: "vegetables" (highest confidence)
  "birthday cake" remains available as second choice
```

---

## 12. Core Feature System

### F1: Automatic Transaction Detection

- Play Store: NotificationListenerService -> capture, parse, store
- Sideload: READ_SMS + BroadcastReceiver + NotificationListenerService
- Package whitelist: maintained as updatable configuration
- Zero manual setup beyond granting notification access
- Background operation strategy determined by field testing (T11): if foreground service needed for OEM reliability -> persistent notification with clear explanation; if listener survives without -> no persistent notification. Decision is per-OEM.

### F2: Transaction Intelligence Pipeline

- 6-axis classification (status, flow, economic_type, instrument, liability_effect, confidence)
- 3-tier intelligence (rules -> patterns -> AI)
- Source-trust scoring (0-100)
- Duplicate detection (fingerprint: amount + time_window + source)
- Promotional/spam filtering
- Failed/reversed/pending state tracking

### F3: Self-Identity Graph

- Onboarding identity declaration
- Auto-discovery from transaction patterns
- Self-transfer detection and classification
- Multi-bank, multi-VPA, multi-instrument support

### F4: Spending Dashboard

- Views: This week / Last week / Current cycle / Previous cycle / Custom range
- Cycle anchored to salary credit date
- Category breakdown (life_area dimension)
- Flow summary: total outflow / total inflow / net
- Excludes: failed, reversed, self-transfers, pending from spend totals

### F5: Transaction Detail View

- All 6 axes visible
- Edit any classification (creates user_override, feeds pattern memory)
- Transaction provenance: source app, raw notification text, trust score
- Linked transactions: credit card spend <-> bill payment, self-transfer pairs

### F6: Cycle Engine

- Auto-detect salary credit date from 2+ salary deposits (5-signal confidence model)
- Anchor spending cycle to salary: e.g., 26th-25th
- If no salary detected: default to calendar month
- User can manually set cycle date
- Mid-cycle start: first cycle is partial, clearly labeled

**Salary Detection -- 5-Signal Confidence Model:**

| Signal | Weight | How Detected |
|--------|--------|-------------|
| Date recurrence | 30% | Credit arrives on same date (+/-2 days) for 2+ months |
| Amount band recurrence | 25% | Amount within +/-10% of previous month |
| Narration pattern | 20% | SMS contains "salary", "sal cr", "payroll", known employer |
| Source consistency | 15% | Always from same sender/account |
| Past user confirmation | 10% | User previously confirmed "this is my salary" |

**Confidence UX:**
- High (>80%): "Your salary of X has been credited -- same date and amount as last month. Starting new cycle." [Confirm] [Not my salary]
- Medium (50-79%): "X was credited. This looks like it could be regular income. Is this your salary?" [Yes] [No] [Tell us more]
- Low (<50%): "X was credited. What is this?" [Salary] [Freelance] [Transfer] [Refund] [Other]

### F7: Credit Card Ledger

See Section 9.

### F8: Budget System

- Phase 1: "Awareness budgets" -- user sets total monthly limit, app shows progress
- No forced methodology
- Per-category budgets (optional)
- Visual: progress bar, burn rate, projected end-of-cycle
- Alerts at 50%, 75%, 90%, 100%

### F9: Pattern Memory & Learning

- Merchant -> category mapping (confirmed after 3 identical classifications)
- Confidence display: "Classified as Groceries - Learned from your history"
- User correction always overrides -> updates pattern
- Confidence decays if user corrects (resets to learning after 2 corrections)

**Confidence thresholds and correction loops:**

| Confidence | Behavior | How Confidence Changes |
|------------|----------|----------------------|
| 0-49% | Always ask user. No suggestion. | +15% each confirm |
| 50-79% | Show suggestion + alternatives. User taps to confirm. | +10% per confirm, -20% per correction |
| 80-94% | Show suggestion with 1-tap confirm. Minimal friction. | +5% per confirm, -15% per correction |
| 95%+ | Silent auto-classify. No prompt. | -25% per correction (drops back to asking) |

Correction loop: If user corrects twice in a row for same counterparty, confidence resets to 50%.

### F10: Search & Filter

- Filter by: date range, amount range, category, economic_type, status, merchant, instrument, confidence
- Text search across merchant names and notes
- Sort by: date, amount, category

### F11: Export

- CSV export with all 6 axes
- Date range selection
- Category/type filter

### F12: Cash Wallet (Optional)

See Section 10.

### Purpose Capture -- Complete Decision Table

| Amount | Merchant | Purpose Conf. | User State | Action |
|--------|----------|--------------|-----------|--------|
| any | any | auto (95%+) | any | Silent auto-classify. No prompt. |
| any | familiar | high (80-94%) | any | Suggest + 1-tap confirm next time app opens. |
| major (>10K) | unknown | none/low | active | Ask within 2 min. |
| major (>10K) | unknown | none/low | inactive | Ask when screen turns on. |
| large (2K-10K) | unknown | none/low | active | Ask within 5 min. |
| large (2K-10K) | unknown | none/low | inactive | Ask when app next opened. |
| medium (500-2K) | unknown | none/low | active | Ask within 10 min. |
| medium (500-2K) | unknown | none/low | inactive | Batch -- ask when app next opened. |
| small (100-500) | unknown | none/low | active | Queue -- show in backlog when app opened. |
| small (100-500) | unknown | none/low | inactive | Queue -- backlog. |
| micro (<100) | unknown | none/low | any | Queue -- backlog. Low amount, don't interrupt. |
| any | any | none/low | busy (3+ in 10min) | NEVER interrupt. Batch all. |
| any | seen 1-2x | low-medium | any | Suggest based on last purpose + 1-tap. |

**Critical rule:** amount < 500 and merchant unknown does NOT mean skip. It means "queue for later, don't interrupt now." It STILL gets captured.

**Prompt dismissal escalation:**
- Dismissed once -> remind in 4 hours
- Dismissed twice -> move to backlog, show count on home screen
- Dismissed 3 times -> stop asking, mark as uncategorized, learn from this
- NEVER ask more than 3 times for the same transaction

### Income & Credit Intelligence

**Core principle: "Money came in" does NOT equal "Income"**

| Credit Type | Is Income? | Affects Budget? | Affects Savings Rate? | Dashboard |
|------------|-----------|----------------|----------------------|-----------|
| Salary | YES | Yes (basis for budget) | Yes (denominator) | Income |
| Non-salary income | YES | Yes | Yes | Income |
| Reimbursement | YES | Yes (recovers past spend) | Yes | Income |
| Gift from family | PARTIAL | Optional (user chooses) | Not by default | Credits (separate) |
| Cashback/Reward | NO | No (not reliable) | No | Credits (separate) |
| Refund | NO | No (reduces net spend) | No | Credits (separate) |
| Borrowed money | ABSOLUTELY NOT | No (liability) | No | Debt tracker |
| Investment redemption | NO | No (asset conversion) | No | Investment flow |
| Self transfer in | NO | No | No | Hidden |

### Trust Ramp (Learning Phases)

| Phase | Period | Behavior |
|-------|--------|---------|
| Bootstrap | Day 0-3 | Every transaction shown for confirmation. Build identity graph. Learn salary date. High question frequency. |
| Baseline | Day 4-14 | Pattern memory forming. Known merchants auto-classify. Unknown still asked. ~60-70% auto. |
| Learning | Day 15-60 | Most recurring merchants learned. AI handles new merchants. 2-3 questions/day. ~80% auto. |
| Mature | Day 61-180 | Deep patterns established. Seasonal patterns beginning. ~90% auto. Meaningful insights. |
| Deep Intelligence | 180+ days | Full cycle comparisons. Year-over-year. Predictive alerts. ~95% auto. |

### Source-Trust Scoring Model

Every transaction gets a trust score (0-100) from 6 weighted signals:

**Signal 1: sender_trust (0-25)**
- Bank app notification: 25
- UPI app notification: 20
- Bank SMS (shortcode): 25
- Bank SMS (regular number): 15
- Unknown app notification: 5
- Unknown SMS sender: 0

**Signal 2: template_match (0-20)**
- Matches known bank template exactly: 20
- Partial match: 12
- Has amount+merchant but no template: 8
- Unstructured text: 0

**Signal 3: transaction_proof (0-20)**
- Contains UPI reference number: 20
- Contains transaction ID: 15
- Contains account number hint: 10
- No reference: 0

**Signal 4: corroboration (0-15)**
- Same transaction from 2+ sources: 15
- 1 source only: 5
- Conflicting data: 0

**Signal 5: ai_confidence (0-10)**
- AI confidence >90%: 10
- AI 70-89%: 7
- AI 50-69%: 4
- No AI / AI <50%: 0
- No AI configured: 5 (neutral)

**Signal 6: historical_pattern (0-10)**
- Matches known recurring pattern: 10
- Similar to past transaction: 5
- Completely new: 0

**Trust Score -> UX Behavior:**

| Score | Behavior |
|-------|---------|
| 90-100 | Silent auto-classify, appears as confirmed |
| 75-89 | Auto-classify with "Review" chip |
| 50-74 | Show as "Suggested: [category]" -- user must confirm |
| 25-49 | Show raw, ask user to classify |
| 0-24 | Show with warning: "Low confidence -- please verify this is real" |

### Fake Alert Defense (5-Layer)

**LAYER 1: Source Filtering**
- Only process notifications from whitelisted packages (see Section 6)
- User can add custom packages with "unverified source" flag

**LAYER 2: Template Validation**
- If notification text doesn't match ANY known template for that sender -> trust capped at 40, flagged for review

**LAYER 3: Anomaly Detection**
- Amount > 2x user's largest known transaction -> flag
- Transaction at 2-4 AM from unknown merchant -> flag
- Burst of 5+ transactions in 1 minute -> flag
- Amount exactly matches phishing pattern (1 rupee, 0) -> flag for review

**LAYER 4: SMS-Specific (Sideload only)**
- Sender must match known bank shortcode database
- SMS containing links -> automatic trust score = 0, flag as phishing
- SMS with "click here", "update KYC", "verify now" -> auto-reject, notify user

**LAYER 5: User Reporting**
- Any transaction can be flagged "This is fake/spam"
- Source gets trust reduction
- 3+ user flags from same source -> auto-blacklist

**Critical rule:** AI is NEVER allowed to "promote" a low-trust message (score <40) into normal flow. AI can only affect the score by +/-10 points.

---

## 13. Platform Constraints / Unsupported Scenarios

### 13.1 Notification Access Revocation
- User can revoke at any time
- App must detect on next launch and prompt re-grant
- No transactions captured while access is revoked
- FROZEN: app must NEVER fail silently if access lost

### 13.2 Work Profile Limitations
- Work profiles run a separate notification channel
- NotificationListenerService in personal profile may NOT receive work-profile notifications
- Status: UNSUPPORTED in Phase 1
- User informed during onboarding if detected

### 13.3 Listener Disconnect / Rebind
- Android may unbind listener under memory pressure
- OEM behavior varies (T12)
- Mitigation: on app foreground, check binding status; if unbound, request rebind

### 13.4 OEM Battery Optimization
- Samsung (Sleeping Apps), Xiaomi (Battery Saver), Realme (App Quick Freeze) may kill background services
- Mitigation determined by T2 and T11:
  - Foreground service with persistent notification
  - Onboarding guidance: "Exclude SpendSense from battery optimization"
  - Both, depending on OEM
- Must provide OEM-specific instructions

### 13.5 Low-RAM Devices Running Android Q (API 29) and Below
- NotificationListenerService CANNOT be enabled or bound on these devices -- platform-level block
- Status: UNSUPPORTED SCENARIO
- Detection: `ActivityManager.isLowRamDevice() && Build.VERSION.SDK_INT <= 29`
- If detected: inform user during onboarding that automatic tracking is unavailable; offer manual-entry-only mode; do NOT request notification access
- Does NOT affect normal-RAM devices on any Android >= 8.0

### 13.6 Low-RAM Devices Running Android R+ (Unknown)
- Behavior on R+ for low-RAM devices is less clearly documented
- Field test T14 required before determining supported/unsupported

### 13.7 Android Version
- Minimum target: Android 8.0 (API 26)
- Android 13+: POST_NOTIFICATIONS required for app's OWN notifications, but listening to others' notifications is unaffected

### 13.8 Unsupported Scenarios in v1

| Scenario | v1 Reality | How We Handle Honestly |
|----------|-----------|----------------------|
| Cash transactions | Cannot detect | "Cash spending is not tracked. Want to add manually?" |
| UPI Lite offline payments | May miss if no SMS/notification | "Some small UPI Lite payments may not appear." |
| Wallet-to-wallet (Paytm internal) | No bank SMS generated | Notification may catch it. If not -> missed. |
| Multi-user / family tracking | Not supported | "SpendSense tracks one person's finances." |
| Investment portfolio tracking | Not supported beyond money movement | "We track money going to/from investments, not performance." |
| Tax calculation | Not supported | "SpendSense is not a tax tool." |
| Foreign currency | Not supported | Transactions in INR only |
| Crypto | Not supported | -- |

### 13.9 Future-Ready Handling

| Scenario | v1 Handling | Future |
|----------|------------|--------|
| UPI Lite (<500 offline) | May not generate SMS. Catch notification if exists. Otherwise: MISSED. | AA catches all posted transactions |
| RuPay credit on UPI | Different SMS format. Rule engine needs RuPay-specific patterns. | Expand rule engine |
| AutoPay mandates | mandate_setup -> IGNORE. mandate_execution -> TRACK. | Same |
| Refunds | Detect via credit SMS with "refund" keyword. Link to original if amount matches within 30 days. | AA reconciliation |
| Reversals | Detect via "reversed"/"reversal". Remove original debit from spend. | Same |
| Chargebacks/Disputes | Manual flag by user. Excluded from spend. | Bank dispute API integration |
| Cash withdrawals | Detect from SMS. Mark as cash_withdrawal. Cash wallet tracks downstream. | Same |
| Investment movement | Detect SIP debits, MF redemption credits. Separate from spend/income. | Portfolio tracking |
| Self transfers | Self-identity graph. Exclude from all dashboards. | AA confirms same-owner accounts |
| Split payments | NOT SUPPORTED as feature. Appears as normal payment. | Splitwise-style tracking |

---

## 14. Privacy / Trust Contract

### What is read
- SMS: Full text of all SMS messages (sideload only, to scan for transactions)
- Notifications: Title + body text of notifications from whitelisted packages ONLY

### What is discarded immediately
- Personal SMS (no financial keywords detected)
- Notifications from non-whitelisted apps
- OTP messages
- Promotional SMS that fail transaction-proof checks

### What is stored locally
- Parsed transaction data (amount, merchant, timestamp, category, purpose, confidence)
- Raw SMS text of confirmed financial transactions (for re-parsing when parser improves)
- Raw notification text of confirmed financial transactions
- Purpose memory (VPA -> name -> purpose mappings)
- Pattern data (confidence scores, recurrence counts)
- User profile (name, cycle day, budget preferences)
- Identity graph
- Credit card ledger data

### What may be sent to AI
- Defined per use case in Section 8, F5
- Raw notification text is NEVER sent to any AI provider
- Account numbers, VPA handles, phone numbers, UPI references, bank names, and balance information are NEVER sent

### What is deleted when user taps "Delete all data"
ALL of the following permanently deleted:
- All transactions (raw + parsed)
- All purpose memory (VPA mappings, named relationships)
- All aliases and contact linkages
- All learned categories and confidence history
- All pattern data (recurrence, auto-classify models)
- All backlog and pending review items
- All AI-derived learnings
- All activity logs
- All user profile data
- All budget configurations
- All cycle history
- All export history metadata
- Self-identity graph
- Credit card ledger
- Cash wallet data
- AsyncStorage completely cleared
- App returns to fresh-install state
- Irreversible, app warns twice before executing

---

## 15. Frozen Logic for Later Sections and Implementation

These decisions are locked. Every subsequent section and all code must respect them.

**M1. Detection:**
- Play Store version uses NotificationListenerService only. No READ_SMS.
- Sideload version uses READ_SMS primary + NotificationListenerService secondary.
- One codebase, build flavor flag controls behavior.
- Foreground service with persistent notification is an implementation decision, not frozen logic. Field testing (T2, T11) determines whether it is needed per OEM.

**M2. Transaction Model:**
- Every transaction has exactly 6 axes: status, flow, economic_type, payment_instrument, liability_effect, confidence.
- Failed/reversed/pending transactions are NEVER counted in spending totals.
- Self-transfers are NEVER counted in spending totals.
- Credit card bill payments are liability settlements, NOT spending.

**M3. Intelligence:**
- 3-tier system: Rules (always) -> Patterns (always) -> AI (optional).
- App must be fully functional with zero AI.
- AI provider is abstracted behind interface. Provider can be swapped without touching classification logic.
- Pattern memory requires 3 confirmations before auto-classifying.

**M4. Identity:**
- Self-identity graph is a first-class system component.
- 4 discovery methods: onboarding, transaction pattern, name-in-VPA, account hint accumulation.
- Self-transfer detection depends on identity graph completeness.

**M5. Trust:**
- Every transaction gets a 0-100 trust score from 6 weighted signals.
- Trust score determines UX behavior (silent/suggest/ask/warn).
- Trust ramp has 5 phases: Bootstrap -> Baseline -> Learning -> Mature -> Deep Intelligence.

**M6. Credit Cards:**
- Each card is a separate liability account.
- Double-count prevention rule is absolute: spend on card = spending, bill payment = settlement.
- Bill payment matching uses payee pattern + amount + timing.

**M7. Cash:**
- Optional tracking, triggered by ATM withdrawal detection.
- Per-withdrawal balance, not running total.
- 3-tap maximum for cash spend entry.
- Never nag about untracked cash.

**M8. Reason Ontology:**
- 6 dimensions: life_area, counterparty_type, intent, recurrence, beneficiary, occasion.
- Indian-specific categories (family_obligation, social_obligation, vice) are first-class.
- 20-cluster Indian money movement map guides default categorization.

**M9. Privacy:**
- All data stored locally on device only.
- AI payloads are defined per use case (see Section 8, F5). Each use case has an explicit whitelist of fields sent and a blacklist of fields never sent.
- Raw notification text is NEVER sent to any AI provider.
- Account numbers, VPA handles, phone numbers, UPI references, bank names, and balance information are NEVER sent to any AI provider.
- No server, no cloud sync, no analytics in Phase 1.
- User can export all their data. User can delete all data with one action.
- Package whitelist is maintainable configuration, not hardcoded.

**M10. Fake Defense:**
- 5-layer defense system is mandatory.
- SMS with links = automatic trust score 0.
- Unknown package notifications = trust capped at 40.
- AI NEVER overrides weak structural authenticity.

---

## 16. Locked Decision Summary

- 6-axis transaction model (status x flow x economic_type x payment_instrument x liability_effect x confidence) is the canonical data model
- Dual distribution architecture: Play Store (notification-first) vs Sideload (SMS-first)
- 3-tier intelligence: Rules (always) -> Patterns (always) -> AI (optional, provider-agnostic)
- Self-identity graph with 4 discovery methods
- Credit card ledger with double-count prevention
- Cash wallet (optional, per-withdrawal, 3-tap max)
- 6-dimension reason ontology with 20-cluster Indian money movement map
- Source-trust scoring (0-100, 6 signals)
- 5-phase trust ramp
- 5-layer fake alert defense
- AI privacy defined per use case with explicit field whitelists/blacklists
- 14 field test items (T1-T14) with defined fallbacks
- Platform constraints documented with supported/unsupported/degraded labels
- All data local, no server, complete deletion on user request
