# SECTION 5 — UX & DESIGN PHILOSOPHY (LOCKED)

> **Status:** LOCKED on 2026-03-28
> **Dependencies:** Sections 1-4 (all locked)
> **Scope:** Design principles, navigation, trust-ramp UX, onboarding, privacy wording, quarantine UX, liability UX, platform-constraint UX, prompt-delivery model

---

## 1. DESIGN PRINCIPLES

### 1.1 The 3 Laws

1. **Truth in 2 seconds** — home screen answers "how much have I spent this cycle" within 2 seconds of opening
2. **Action in 3 taps** — any user task completes in 3 taps or fewer
3. **Zero guilt** — the app shows facts, never judges

### 1.2 The Trust-First Principle

SpendSense never pretends to know more than it does.

- If a total is approximate, it says so
- If a classification is uncertain, it looks uncertain
- If data is missing, the screen shows a gap, not a guess
- If a transaction is suspicious, it is visually separated from confirmed reality

### 1.3 The Honesty-Over-Comfort Principle

When the app does not have enough data to show a reliable summary, it says:

> "SpendSense has captured 12 transactions so far. Your totals may be incomplete until the app has seen a full spending cycle."

It does NOT show a confident-looking total when it has only been running for 3 days and may have missed transactions before installation.

### 1.4 The Privacy-as-Design Principle

Privacy is not a settings page. It is a visible design commitment.

- The app never asks for bank credentials
- The app never asks for Aadhaar, PAN, or government ID
- Data lives on the device by default
- If the user enables AI features, the app explains exactly what leaves the device, in plain language, at the moment of enabling — not buried in a policy document

### 1.5 Visual Identity

**Color Philosophy:**

| Role | Usage |
|------|-------|
| Primary | Calm blue or teal — trust, clarity |
| Outflow | Neutral warm tone — spending is normal |
| Inflow | Neutral cool/green — income is expected |
| Self-transfer | Grey/muted — de-emphasized, not real spending |
| Warning/Review | Amber/orange — needs attention |
| Error/Fake/Suspicious | Red (sparingly) — genuine problems only |
| Approximate/Learning | Dotted/dashed visual treatment — uncertainty is visible |

**Iconography:**
- Custom line-icon set for all 22 life_area values
- Icons used consistently in all UI — no emoji anywhere in the app
- Icons render identically across all Android OEMs
- Each life_area has one assigned icon, used in cards, chips, category breakdowns, and budget views

**Typography:** One family, two weights, large amounts, no decorative fonts.

---

## 2. NAVIGATION AND INFORMATION ARCHITECTURE

### 2.1 Tab Model: 4 Tabs

```
+----------+----------+----------+----------+
|   Home   |   Txns   |  Money   | Settings |
+----------+----------+----------+----------+
```

| Tab | Question it answers | Section 4 features served |
|-----|-------------------|--------------------------|
| **Home** | "Where is my money going this cycle?" | F4 (Dashboard), F6 (Cycle), insights |
| **Txns** | "Show me the details" | F2 (Intelligence), F5 (Detail), F10 (Search), quarantine view |
| **Money** | "What is the state of my money?" | F7 (Credit cards), F8 (Budget), F12 (Cash wallet) |
| **Settings** | "Let me configure things" | F3 (Identity), F11 (Export), AI config, sources, preferences |

**Why "Money" instead of "Budget":**
The old "Budget" tab only served one feature. Section 4 locked three first-class financial tracking systems: budget progress (F8), credit card liability (F7/D3), and cash wallet (F12/H). These all answer "What is the state of my money right now?" — different from "Where did my money go?" (Home) or "Show me every transaction" (Txns).

**Discoverability check:**
- Credit card obligations -> Money tab, always visible
- Pending classification reviews -> Home tab (pending section) + Txns tab (filter: "Needs review")
- Quarantined/suspicious items -> Txns tab (dedicated quarantine section at top)
- Cash wallet -> Money tab
- Budget -> Money tab

### 2.2 Screen Map

```
HOME
 +-- Cycle header: "Mar 26 - Apr 25" + days remaining
 +-- Summary cards (see Section 2.3)
 +-- Pending Actions section
 |   +-- "[N] transactions need classification" -> batch classifier
 |   +-- "[N] suspicious items need review" -> quarantine
 |   +-- "[Card name] payment due in [N] days" -> Money tab
 +-- Category breakdown (top 5, with visual bars)
 |   +-- Only shown when trust phase >= Baseline
 +-- Insight cards (1-2 per cycle, template or AI)
 +-- "Log cash" quick button (only if cash wallet active)

TRANSACTIONS
 +-- Quarantine section (top, amber-bordered, if any exist)
 |   +-- "[N] suspicious transactions"
 |   +-- Expandable -> shows quarantined items with action buttons
 +-- Filter/search bar
 |   +-- Filters: date, category, amount, status, instrument, confidence
 +-- Transaction list (chronological, current cycle default)
 |   +-- Confirmed transactions (solid cards)
 |   +-- Learned transactions (solid + "Auto" indicator)
 |   +-- Suggested transactions (outlined cards, "Suggested" chip)
 |   +-- Unclassified transactions (inline, "Tap to classify")
 +-- Tap any -> Detail view
     +-- All 6 axes displayed in plain language
     +-- Edit classification
     +-- Provenance: source app, trust score (shown as "Detection confidence: High/Medium/Low")
     +-- Linked transactions (CC spend <-> bill payment, self-transfer pairs)

MONEY
 +-- Budget section
 |   +-- Overall progress bar + burn rate
 |   +-- Per-category progress (if set)
 |   +-- Projected end-of-cycle
 |   +-- "Set/edit budget"
 +-- Credit Cards section (one card per expandable panel)
 |   +-- Card name + last 4
 |   +-- Outstanding amount (prominent)
 |   +-- Due date + days remaining
 |   +-- Minimum due
 |   +-- This cycle's card spending by category
 |   +-- Tap -> card detail (full history, bill payment matching)
 +-- Cash Wallet section (only if active)
 |   +-- Cash in hand: amount
 |   +-- "Log cash spend" button
 |   +-- Recent cash spends
 +-- Net Position summary
     +-- Total credit card liability (across all tracked cards)
     +-- Cash in hand (if cash wallet active)
     +-- "This is your money picture as seen through your transactions."
     +-- NO bank balance trend (deferred out of v1)

SETTINGS
 +-- My Accounts (identity graph management)
 |   +-- Confirmed VPAs / accounts / cards / wallets
 |   +-- Suspected identities (confirm/deny)
 |   +-- Add manually
 +-- Spending Cycle (salary date config)
 +-- AI Classification
 |   +-- Status: "Off - using rules and your history" / "On - [provider]"
 |   +-- Enter/change API key
 |   +-- What data is sent (plain language explanation)
 |   +-- Usage stats
 +-- Notification Sources (whitelist)
 +-- Classification Prompts (see Section 7)
 +-- Export Data
 +-- Delete All Data
 +-- Permissions Status
 |   +-- Notification access: Granted / Not granted [Fix]
 |   +-- Battery optimization: Excluded / Not excluded [Fix]
 |   +-- (Sideload only) SMS access: Granted / Not granted [Fix]
 +-- About
```

### 2.3 Home Summary — Precise Language

The home screen shows these summary numbers, carefully labeled:

```
+------------------------------------------+
|  Mar 26 - Apr 25           12 days left  |
|------------------------------------------|
|                                          |
|  Spent this cycle               ₹18,450  |
|  +-- Confirmed                  ₹15,200  |
|  +-- Estimated*                  ₹3,250  |
|                                          |
|  Earned income                  ₹45,000  |
|                                          |
|  Other credits                   ₹2,100  |
|  (refunds, cashback)                     |
|                                          |
|------------------------------------------|
|  * Estimated = auto-classified,          |
|    not yet reviewed by you               |
+------------------------------------------+
```
(All amounts shown with rupee symbol in actual app)

**What each line means (mapped to Section 4 economic types):**

| Display Label | Includes | Excludes |
|--------------|----------|----------|
| **Spent this cycle** | genuine_spend, bill_payment, subscription, insurance_premium, charity_donation, government_payment, fee_charge, group_split_paid, gift_given | self_transfer, credit_card_payment (liability settlement), investment_out, lent_out, cash_withdrawal |
| **-- Confirmed** | Transactions with confidence = user_confirmed, user_override, or auto_high (95%+) | Everything below 95% confidence |
| **-- Estimated** | Transactions with confidence = auto_medium (80-94%) or suggested (50-79%) | Unclassified (not counted in total yet), uncertain (<50%) |
| **Earned income** | salary_credit, secondary_income | Everything else |
| **Other credits** | refund, cashback_reward, gift_received, government_receipt, loan_recovery_in, group_split_received | salary_credit, secondary_income, self_transfer inflows, investment_return |

**What is explicitly NOT shown in the top summary:**
- Self-transfers (internal flow — not spending or income)
- Investment outflows (money moved, not spent)
- Credit card bill payments (liability settlement — shown in Money tab)
- Lent out / borrowed in (receivable/liability — future feature)
- Cash withdrawals (instrument change, not spending — cash wallet tracks downstream)
- Unclassified transactions (not counted until classified — shown in pending section)
- Pending/failed/reversed transactions (not real money movement)

**Why "Estimated" exists:** A user who sees a total must know that part of it was auto-classified and might be wrong. The asterisk and breakdown make this visible without being alarming. As the user confirms transactions, "Estimated" shrinks toward zero.

### 2.4 Inflow Confidence Rules

Inflows follow the same confidence axis as spending, but with stricter thresholds because misclassifying an inflow as "income" is more dangerous than misclassifying a spend category.

**Earned Income display rules:**

| Condition | What Home Shows |
|-----------|----------------|
| Salary detected with high confidence (amount matches prior months +/-10%, arrives within +/-3 days of expected date, from known employer identifier) | `Earned income  [amount]` — shown as confirmed |
| Salary-like credit detected but first occurrence OR amount differs significantly from prior | `Earned income  [amount] (estimated)` — shown with estimated marker and "First detection - confirm in Txns" |
| No salary detected this cycle yet, but expected based on history | Row hidden entirely — not shown as zero |
| No salary pattern established yet (bootstrap/baseline phase) | Row hidden entirely |
| User manually confirms a transaction as salary | Shown as confirmed regardless of auto-detection |

**The rule:** Earned income is NEVER shown as a confident number unless it has been confirmed by the user at least once previously OR matches a confirmed salary pattern (same source, similar amount, expected timing) for 2+ consecutive cycles.

**Other Credits display rules:**

| Condition | What Home Shows |
|-----------|----------------|
| Refund matched to a prior outflow (e.g., Amazon refund matches Amazon purchase) | Shown in Other credits |
| Cashback from known cashback source | Included in Other credits |
| Unidentified inflow, could be refund/transfer/income | NOT shown in Other credits — goes to unclassified inflows in Pending Actions |
| No confirmed credits this cycle | Row hidden entirely |

**Unclassified inflows:**
- Appear in Pending Actions as "N inflows need identification"
- Tapping opens classification flow: "Is this salary / refund / transfer from your other account / someone paying you back / other?"
- NOT counted in Earned income or Other credits until classified
- Shown in Transactions tab as normal unclassified items
- If user ignores them, they remain unclassified and uncounted

---

## 3. UNIFIED CONFIDENCE / BADGE SYSTEM

### 3.1 The 5-State Model

| State | Confidence Score | Meaning | Source |
|-------|-----------------|---------|--------|
| **Confirmed** | N/A (user action) | User has verified this classification | User classified, user corrected, or user explicitly confirmed auto-classification |
| **Learned** | 85-100% | Pattern-matched from confirmed user history | 3+ prior confirmed transactions from same merchant/source with same classification |
| **Suggested** | 50-84% | Auto-classified but uncertain | AI classification, weak pattern match, rule-based guess |
| **Unclassified** | N/A | No classification attempted or possible | New merchant, no pattern, no AI, or AI returned low confidence |
| **Quarantined** | N/A (trust flag) | Transaction authenticity is suspect | Fake-alert defense triggered, suspicious source, anomalous pattern |

**Key design decisions:**
- "Confirmed" and "Quarantined" are user-action states, not confidence scores
- "Learned" and "Suggested" differ by threshold AND evidence depth (Learned requires 3+ historical confirmations)
- "Unclassified" is not a failure state — it is an honest "we don't know yet"

### 3.2 Badge System

| State | Badge Text | Visual | Card Treatment |
|-------|-----------|--------|---------------|
| **Confirmed** | None (no badge — this is the default clean state) | Solid card, full color, clean | Standard |
| **Learned** | Small "Auto" text + pattern icon, bottom-right | Solid card, full color, subtle indicator | Standard with indicator |
| **Suggested** | "Suggested: [category]" chip | Outlined/lighter card | Visually distinct from confirmed |
| **Unclassified** | "Tap to classify" action chip | Neutral card, action-oriented | Interactive prompt |
| **Quarantined** | "Suspicious - verify" label + alert icon | Amber border, separated from main list | Isolated section, never inline |

### 3.3 How States Affect Totals

| State | Counted in Home totals? | Label treatment |
|-------|------------------------|----------------|
| **Confirmed** | Yes, as "Confirmed" subtotal | Solid number |
| **Learned** | Yes, as "Confirmed" subtotal (trusted enough) | Solid number |
| **Suggested** | Yes, as "Estimated" subtotal | Marked with asterisk |
| **Unclassified** | No — excluded until classified | Pending count shown |
| **Quarantined** | No — excluded until user confirms authenticity | Quarantine count shown separately |

### 3.4 State Transitions

```
                    +---------------+
                    |  Quarantined  |
                    +-------+-------+
                            | User confirms real
                            v
+--------------+    +---------------+    +-------------+
| Unclassified |--->|   Suggested   |--->|  Confirmed  |
+--------------+    +---------------+    +-------------+
      |                                        ^
      |         +---------------+              |
      +-------->|    Learned    |--------------+
                +---------------+    (user confirms
                                      or corrects)

Quarantined -> "Mark fake" -> Deleted (never enters main flow)
Quarantined -> "Ignore" -> Stays quarantined, ages out after 30 days
```

---

## 4. ONBOARDING

### 4.1 Play Store Version

```
Screen 1: Welcome
  "SpendSense automatically tracks your payments
   by reading notifications from your bank and UPI apps.

   By default, your data stays on this device.
   No bank login. No account linking.
   No SpendSense server."

  [Get started]

Screen 2: Notification Access
  "To detect your payments, SpendSense needs
   Android's notification access permission.

   This permission gives SpendSense visibility
   into notifications from all apps on your phone.

   Here is what SpendSense does with that access:
    - Checks each notification against a list of
      known banking and UPI apps
    - If it matches: extracts transaction details
      and stores only finance-relevant data on
      this device
    - If it doesn't match: discards it immediately
      -- nothing is stored or processed

   SpendSense never stores the content of
   non-financial notifications."

  [Which apps does SpendSense watch?]
    -> Expandable:
    "SpendSense maintains a list of known banking and
     UPI apps (SBI YONO, HDFC, Google Pay, PhonePe, etc.).
     Only notifications from these apps are processed.
     You can review and edit this list in Settings."

  [Grant notification access] -> system dialog

  If denied:
    "No problem. You can add transactions manually
     or grant access later in Settings."
    [Continue without auto-tracking]

Screen 3: Your Accounts (optional, skippable)
  "Which banks do you use? This helps SpendSense
   recognize your accounts faster."
  [SBI] [HDFC] [ICICI] [Kotak] [Axis] [Other]
  Phone number: [_________]
    "Used to identify your UPI addresses like
     [phone]@ybl, [phone]@paytm. Stored only on your phone."
  [Skip -- I'll set this up later]

Screen 4: Salary Cycle (optional, skippable)
  "When does your salary usually arrive?"
  [Around 1st] [Around 25th-28th] [Varies] [No fixed salary]
  "SpendSense will auto-detect this from your transactions."
  [Skip]

Screen 5: Done
  "You're all set.

   SpendSense is now watching for payments.
   By default, all your data stays on this device.
   There is no SpendSense server.

   If you later enable optional AI features,
   SpendSense will show you exactly what limited
   data would be shared -- and ask your permission
   before sending anything."

  [Open SpendSense]
```

### 4.2 Sideload Version — Differences

Screen 2 is replaced with two permission screens:

```
Screen 2a: SMS Access
  "This version of SpendSense can read SMS messages
   for more accurate transaction detection.

   Android's SMS permission gives SpendSense access
   to all SMS on your phone. Here is what SpendSense
   does with that:

    - Checks each incoming SMS against known bank
      sender IDs and shortcodes
    - If it matches: extracts transaction details
      and stores only finance-relevant data on
      this device
    - If it doesn't match: ignores it completely
      -- nothing is stored

   SpendSense never stores personal messages."

  [Grant SMS access] -> system dialog
  [Skip -- use notification detection only]

Screen 2b: Notification Access
  "For complete coverage, SpendSense also monitors
   notifications from banking and UPI apps.

   This catches transactions that arrive as app
   notifications instead of SMS."

  [Grant notification access] -> system dialog
  [Skip]

  If both denied:
    "SpendSense will work in manual-entry mode.
     You can grant access anytime in Settings."
```

### 4.3 AI Enable Moment (triggered in Settings when user enters API key)

```
+------------------------------------------+
|  Enable AI Classification                |
|                                          |
|  When AI is enabled, SpendSense sends    |
|  limited data to classify transactions   |
|  you haven't reviewed yet.               |
|                                          |
|  What is sent:                           |
|   - Amount (e.g., 450 rupees)            |
|   - Merchant name (e.g., "DMart")        |
|   - Payment type (e.g., UPI)             |
|   - Time of day (e.g., "evening")        |
|                                          |
|  What is NEVER sent:                     |
|   - Your bank account numbers            |
|   - Your UPI addresses                   |
|   - Your phone number or name            |
|   - Your balance or transaction history  |
|   - The raw notification text            |
|                                          |
|  You can disable this anytime.           |
|  SpendSense works without AI --          |
|  it just asks you more questions.        |
|                                          |
|  [Enable AI]     [Not now]               |
+------------------------------------------+
```

---

## 5. QUARANTINE / SUSPICIOUS TRANSACTION UX

### 5.1 Where Quarantined Items Appear

**Place 1: Transactions tab — dedicated Quarantine section at top**

```
+------------------------------------------+
|  [!] 2 suspicious transactions           |
|  These were detected but look unusual.   |
|  Please verify before they are counted.  |
|                                          |
|  +--------------------------------------+|
|  | [!] 49,999 from unknown source       ||
|  | Unrecognized app - Today 2:14 AM     ||
|  | Trust: Low                            ||
|  |                                       ||
|  | [Real transaction]  [Fake/Spam]       ||
|  |                     [Ignore]          ||
|  +--------------------------------------+|
|                                          |
|  +--------------------------------------+|
|  | [!] 1 rupee "credited" from 98765... ||
|  | SMS with link - Today 11:45 AM       ||
|  | Trust: Very low -- contains link      ||
|  |                                       ||
|  | [Real transaction]  [Fake/Spam]       ||
|  |                     [Ignore]          ||
|  +--------------------------------------+|
|------------------------------------------|
|  [Normal transaction list below]         |
+------------------------------------------+
```

**Place 2: Home tab — Pending Actions section**
```
|  Pending Actions                         |
|  [3 transactions need classification]    |
|  [!] 2 suspicious items need review      |
```

### 5.2 How Quarantine Differs from Normal Unclassified

| Aspect | Unclassified Transaction | Quarantined Transaction |
|--------|------------------------|------------------------|
| Trust score | Has suggestion or no suggestion but source is trusted | Flagged by defense layers or anomalous |
| Location | Inline with normal transactions | Separated section at top of Txns tab |
| Visual | Standard card, "Tap to classify" chip | Amber/red border, warning icon, "Suspicious" label |
| Counted in totals? | Not counted (pending) | NOT counted until user confirms |
| User actions | Classify (select category) | Confirm real / Mark fake / Ignore |
| Prominence | Normal | High — always visible at top |

### 5.3 User Action Flows

**Confirm as real:**
- Transaction moves from quarantine to normal feed
- Classification prompt appears immediately
- User classifies
- Transaction counted in totals as "Confirmed"
- Source trust NOT damaged

**Mark as fake/spam:**
- Confirmation dialog: "Mark this as fake? It will be removed."
- Transaction deleted
- Source package/sender gets trust reduction
- If 3+ fakes from same source -> source auto-blacklisted
- User sees: "Marked as fake. Source trust reduced."

**Ignore:**
- Transaction stays in quarantine
- Not counted in any total
- After 30 days: auto-archived with "Ignored -- never verified" label
- Never counted in any summary or export unless user explicitly confirms later

---

## 6. LIABILITY / CREDIT CARD UX

### 6.1 Credit Card Visibility — Three Surfaces

**Surface 1: Money tab — Credit Cards section (primary)**

```
+------------------------------------------+
|  CREDIT CARDS                            |
|                                          |
|  +--------------------------------------+|
|  | HDFC Regalia ....2345                ||
|  |                                      ||
|  | Outstanding     23,450               ||
|  | Due date        Apr 5 (9 days)       ||
|  | Minimum due     1,820                ||
|  |                                      ||
|  | This cycle on card:                  ||
|  |  Food 2,800 - Shopping 6,450        ||
|  |  Fuel 3,000 - Other 4,200           ||
|  |                                      ||
|  | [View details]  [Log bill payment]   ||
|  +--------------------------------------+|
|                                          |
|  [+ Add credit card]                     |
+------------------------------------------+
```

**Surface 2: Home tab — Pending Actions (due date approaching)**
```
|  Pending Actions                         |
|  [HDFC ....2345 payment due in 3 days    |
|   Outstanding: 23,450]                   |
```
Appears when due date is 7 days or fewer away. Tapping navigates to Money tab card detail.

**Surface 3: Transaction detail view — linked transactions**

When viewing a credit card spend:
```
|  6,450 to Amazon                         |
|  Instrument: Credit card (HDFC ....2345) |
|  Liability effect: Creates liability     |
|                                          |
|  This spend is part of your HDFC card    |
|  outstanding balance.                    |
```

When viewing a credit card bill payment:
```
|  18,200 to HDFCBILL                      |
|  Type: Credit card payment               |
|  Liability effect: Settles liability     |
|                                          |
|  This settles your HDFC ....2345         |
|  statement balance.                      |
|  NOT counted as spending.                |
```

### 6.2 Double-Count Education

First time a user has both a card spend and bill payment in the same cycle, show a one-time educational card on Home:

```
+------------------------------------------+
|  How SpendSense counts card spending     |
|                                          |
|  When you buy something with your card,  |
|  that's spending -- counted once.        |
|                                          |
|  When you pay your card bill, that's     |
|  settling what you owe -- NOT counted    |
|  as spending again.                      |
|                                          |
|  Your total spending stays accurate.     |
|                                          |
|  [Got it]                                |
+------------------------------------------+
```

Shown once. Dismissible. Never repeated.

---

## 7. PURPOSE-CAPTURE PROMPT DELIVERY MODEL

### 7.1 The Problem

If the app only prompts when the user opens it, classification backlogs grow. Users see 47 unclassified transactions, feel overwhelmed, and close the app. The learning loop dies.

### 7.2 Delivery Surfaces

| Surface | Description | Default | User can disable? |
|---------|------------|---------|-------------------|
| **In-app queue** | Pending Actions section on Home + Txns tab | Always on | No (core feature) |
| **Smart notification** | Push notification with inline quick-action buttons | On | Yes |
| **Batch digest** | Single daily notification summarizing unclassified items | Off (fallback) | Yes |
| **Floating prompt** | Overlay bubble that appears after transaction detection | Off | Yes (opt-in in Settings) |

### 7.3 Decision Logic

```
on_transaction_detected(tx):

  // STEP 1: Should we prompt at all?
  if tx.state == "Quarantined":
    -> always prompt (safety-critical)
    -> delivery: smart_notification (immediate)
    -> skip all other logic

  if tx.state == "Learned" and confidence >= 85%:
    -> do NOT prompt
    -> auto-classify silently
    -> user can review later in Txns tab
    -> DONE

  if tx.state == "Suggested" and confidence >= 70%:
    -> do NOT prompt immediately
    -> add to in-app queue
    -> include in batch digest if enabled
    -> DONE

  // STEP 2: When do we prompt?
  if is_burst_mode():  // 3+ transactions in 5 minutes
    -> do NOT prompt per-transaction
    -> set burst_timer = 10 minutes after last transaction
    -> when timer fires, send ONE batch prompt:
      "You had [N] transactions in the last hour.
       Tap to review."
    -> DONE

  if time_is_quiet_hours():  // 11pm - 7am
    -> queue for morning
    -> send batch digest at 9am (or user-configured time)
    -> DONE

  // STEP 3: How do we prompt?
  prompt_surface = decide_surface(tx)

  function decide_surface(tx):

    // PRIMARY PATH: user is NOT in SpendSense
    // This is the overwhelmingly common case.
    // The user just paid via GPay/PhonePe/bank app/
    // is on lock screen/is in another app entirely.

    if NOT spendsense_is_visible():

      if user_has_floating_prompt_enabled()
         AND overlay_permission_granted()
         AND NOT fullscreen_app_active()
         AND NOT user_in_call():
        -> return "floating_prompt"

      if user_dismissal_rate < 40%:
        -> return "smart_notification"
        // This is the default real-time surface
        // for the vast majority of transactions.

      -> return "batch_digest"
      // User has shown they don't want per-tx prompts.

    // SECONDARY PATH: user happens to have SpendSense open
    // Rare during real-time detection, but possible if
    // user is reviewing transactions and a new one arrives.

    if spendsense_is_visible():
      -> return "in_app_inline"
      // Show classification card at top of current screen.
      // Auto-dismisses after 15 seconds if ignored.
      // Do NOT also send a notification -- no double-prompt.

  // STEP 4: Escalation / backlog management
  if tx remains unclassified after 24 hours:
    -> no re-prompt
    -> stays in in-app queue
    -> included in next batch digest (if enabled)

  if tx remains unclassified after 7 days:
    -> move to "backlog" in Txns tab
    -> no longer shown in Home pending count
    -> still accessible via Txns filter: "Backlog"
    -> still NOT counted in confirmed totals

  if tx remains unclassified after 30 days:
    -> one final batch prompt:
      "You have [N] old transactions that were never classified.
       Classify now or archive as uncategorized?"
    -> [Classify] opens batch flow
    -> [Archive] -> marked "Uncategorized" permanently
    -> counted in spending total as "Uncategorized"
      (because after 30 days, the money did leave --
       we just don't know the purpose)
```

### 7.4 Smart Notification Design

```
+------------------------------------------+
| SpendSense                          now  |
| 450 at DMart                             |
| What was this for?                       |
|                                          |
|  [Groceries]  [Household]  [Other >]    |
+------------------------------------------+
```

**Rules:**
- Quick-action buttons show top 2 suggested categories + "Other"
- Tapping a category classifies without opening the app
- Tapping "Other" opens the app to full classification flow
- Max 3 smart notifications per hour (hard cap)
- Max 8 smart notifications per day (hard cap)
- If caps hit, remaining queue for batch digest
- Never sent for: Learned transactions, self-transfers, transactions under 10 rupees (configurable)

### 7.5 Floating Prompt Design (opt-in only)

```
+------------------------+
| 450 DMart              |
| [Groceries] [Other]    |
|            [Later]      |
+------------------------+
```

**Rules:**
- Small overlay bubble, appears 3-5 seconds after detection
- Shows for 10 seconds, then auto-minimizes to dot at screen edge
- "Later" dismisses to in-app queue
- Requires Android 8+ (overlay permission)
- Disabled during fullscreen apps and phone/video calls
- Max 5 floating prompts per hour
- If user dismisses 3 in a row, switch to smart notification for rest of session

### 7.6 Batch Digest Design

```
+------------------------------------------+
| SpendSense - Daily summary          9am  |
| You had 6 transactions yesterday.        |
| 2 were auto-classified.                  |
| 4 need your input.                       |
|                                          |
|  [Review now]                            |
+------------------------------------------+
```

**Rules:**
- Sent once daily at user-configured time (default 9am)
- Only sent if >0 unclassified items from previous day
- If user ignores 5 consecutive daily digests, reduce to weekly
- If user ignores 3 consecutive weekly digests, stop and rely on in-app queue only

### 7.7 Settings: Prompt Preferences

```
SETTINGS -> Classification Prompts

  Prompt style:
    ( ) Smart notifications (recommended)
        -- asks about each transaction as it happens
    ( ) Daily digest only
        -- one summary per day
    ( ) In-app only
        -- no notifications, review when you open the app

  [ ] Enable floating prompt (power users)
      -- overlay bubble after each transaction
      -- requires screen overlay permission

  Quiet hours: [11:00 PM] to [7:00 AM]
  Daily digest time: [9:00 AM]

  Minimum amount for notification: [10 rupees]
```

---

## 8. TRUST-RAMP PROGRESSION MODEL

### 8.1 Design Principle

Trust-ramp phases are unlocked by evidence thresholds, not calendar days. Time serves only as a soft floor (minimum time that must pass) and a soft ceiling (maximum time before the app tries to progress anyway, to avoid trapping low-volume users).

### 8.2 Phase Definitions

#### Phase 1: Bootstrap

**Meaning:** SpendSense is brand new. Everything is uncertain.

**Entry:** App installed, permissions granted.

**Exit (ALL must be true):**

| Threshold | Minimum | Purpose |
|-----------|---------|---------|
| Time since install | >= 3 days | Soft floor — prevents false maturity from single shopping spree |
| Transactions detected | >= 10 | Enough data to start pattern matching |
| Transactions confirmed by user | >= 5 | User has actively engaged |
| Distinct merchants seen | >= 3 | Not just repeated transactions |

**UX:**
- Home total shown but labeled "All estimated -- tap to review"
- Category breakdown HIDDEN
- Cycle comparison HIDDEN
- Insights HIDDEN
- Learning message shown (dashed border box)
- Inflow lines (Earned income, Other credits) HIDDEN
- Pending Actions section prominent

**Soft ceiling:** If 14 days pass without meeting thresholds, show gentle prompt. Do NOT auto-advance.

#### Phase 2: Baseline

**Exit (ALL must be true):**

| Threshold | Minimum | Purpose |
|-----------|---------|---------|
| Time since install | >= 14 days | Soft floor — need time diversity |
| Transactions confirmed by user | >= 15 | Enough confirmed classifications |
| Distinct economic types confirmed | >= 3 | Spending is diverse enough |
| Learned-state accuracy | >= 75% | Pattern engine is working |
| Unresolved backlog ratio | <= 50% | User is keeping up |

**UX:**
- Confirmed/estimated split visible in totals
- Category breakdown appears, labeled "based on confirmed transactions"
- Cycle comparison HIDDEN
- Insights HIDDEN
- Learning message removed
- Earned income shown if detected, with "(estimated)" if first occurrence
- Other credits shown if confirmed

**Soft ceiling:** 30 days. Show encouragement. Do NOT auto-advance.

#### Phase 3: Learning

**Exit (ALL must be true):**

| Threshold | Minimum | Purpose |
|-----------|---------|---------|
| Complete spending cycles observed | >= 1 | Need full-cycle data |
| Time since install | >= 45 days | Soft floor — need real time diversity |
| Transactions confirmed by user | >= 40 | Substantial training data |
| Distinct merchants with learned patterns | >= 8 | Pattern engine covers regular merchants |
| Learned-state accuracy | >= 80% | Pattern engine is reliable |
| Salary pattern confidence | >= 1 confirmed salary OR user marked "no fixed salary" | Income line can be trusted |
| Unresolved backlog ratio | <= 30% | User is engaged |

**UX:**
- Full category breakdown (confirmed + estimated, estimated as lighter fill)
- Cycle comparison if complete previous cycle exists
- First template-based insights
- Earned income shown as confirmed if salary pattern verified
- Pending actions section smaller

**Soft ceiling:** 90 days — auto-advance with persistent caveat note.

#### Phase 4: Mature

**Exit (ALL must be true):**

| Threshold | Minimum | Purpose |
|-----------|---------|---------|
| Complete spending cycles observed | >= 3 | Multiple cycles for trends |
| Time since install | >= 150 days | Soft floor — seasonal diversity |
| Learned-state accuracy | >= 85% | High reliability |
| Unresolved backlog ratio | <= 15% | Consistently engaged |

**UX:**
- Multi-cycle comparisons
- Richer insights (trend-based, anomaly-detection)
- Budget suggestions based on history
- Pending actions rare (0-3 items typical)

#### Phase 5: Deep Intelligence

**Entry:** >= 180 days AND >= 6 complete cycles AND accuracy >= 85%

**UX:**
- Same-month-last-year comparisons
- Seasonal pattern insights
- Predictive budget recommendations
- Nearly zero pending items for regular merchants

### 8.3 Regression Rules

| Condition | Regression |
|-----------|-----------|
| Learned-state accuracy drops below 65% for 2 consecutive weeks | Drop one phase |
| Unresolved backlog ratio exceeds 60% for 2 consecutive weeks | Drop one phase |
| User performs bulk "undo all auto-classifications" | Drop to Baseline |
| User resets identity graph | Drop to Bootstrap |
| Notification access revoked | Freeze phase, show warning. If >7 days without access, drop to Bootstrap |

### 8.4 Phase Indicator (visible to user)

In Settings -> About:

```
SpendSense accuracy: Learning
  28 transactions confirmed
  12 merchants recognized
  Pattern accuracy: 82%
  Next milestone: complete first full cycle
```

Shown in plain language. Not a progress bar. Not gamified. Just factual.

---

## 9. PLATFORM-CONSTRAINT UX

### 9.1 Low-RAM Android Q and Below (Unsupported)

**Detection:** `ActivityManager.isLowRamDevice() && Build.VERSION.SDK_INT <= 29`

**Onboarding:** Screen 2 replaced with:
```
+------------------------------------------+
|  Your device doesn't support             |
|  automatic tracking                      |
|                                          |
|  SpendSense uses notification access     |
|  to detect payments automatically.       |
|  This feature isn't available on         |
|  your device's Android version.          |
|                                          |
|  You can still use SpendSense to:        |
|   - Add transactions manually            |
|   - Track spending by category           |
|   - Set budgets and monitor progress     |
|                                          |
|  [Continue with manual tracking]         |
+------------------------------------------+
```

**Settings:** Notification access row shows "Not available on this device" — no toggle, no "Fix" button.

**Tone:** Factual, not apologetic.

### 9.2 Work Profile

**Detection:** No bank notifications after 48 hours despite permission granted, work profile detected.

**Settings:**
```
|  Notification access: Granted             |
|  (i) If your banking apps are in a work   |
|    profile, SpendSense may not receive     |
|    their notifications. Move banking       |
|    apps to your personal profile for       |
|    automatic tracking.                     |
```

Not shown during onboarding — only surfaces if problem detected.

### 9.3 Notification Access Revoked

**Detection:** On every app open, check enabled listener packages.

**Home screen:** Persistent banner, not dismissible until resolved:
```
+------------------------------------------+
|  [!] Auto-tracking is paused             |
|                                          |
|  SpendSense can't detect payments        |
|  because notification access was         |
|  turned off.                             |
|                                          |
|  Transactions during this time           |
|  may be missing.                         |
|                                          |
|  [Restore access]  [Use manual mode]     |
+------------------------------------------+
```

### 9.4 OEM Battery Optimization

**Detection:** After first 24 hours, if listener appears killed (gap in capture).

**Settings:**
```
|  Background tracking: May be restricted   |
|                                           |
|  Your phone's battery settings may stop   |
|  SpendSense from running in background.   |
|                                           |
|  [Show me how to fix this]                |
|  -> Opens OEM-specific instructions:      |
|    Samsung: Settings -> Battery -> ...    |
|    Xiaomi: Settings -> Battery -> ...     |
|    Realme: Settings -> Battery -> ...     |
|    Other: Settings -> Apps -> SpendSense  |
|           -> Battery -> Unrestricted      |
```

**Tone:** Helpful, not blaming. "Your phone's settings" not "Your phone is blocking us."

### 9.5 Listener Disconnect / Rebind Failure

**Detection:** On app foreground, verify listener is bound.

**If unbound:**
```
Home banner:
|  [!] Auto-tracking needs attention       |
|  SpendSense's background listener        |
|  was stopped. Tap to restart.            |
|  [Restart tracking]                      |
```

Tapping triggers rebind. If rebind fails, escalate to battery optimization guidance.

### 9.6 Low-RAM Android R+ (Unknown)

No special UX for now. Added to field testing (Section 4 T14). Design ready to apply 9.1 treatment if needed.

---

## 10. UNCHANGED FROM ORIGINAL DRAFT

These sections survived without correction:

- **Notification philosophy:** Anti-spam, no transaction echo notifications, max 3 budget alerts per cycle
- **Empty states:** Honest messaging, no demo data
- **Indian context:** Rupee formatting, lakh/crore, 12-hour time, cultural sensitivity rules, no guilt/scores/comparison
- **Device targets:** 5.5"-6.7" primary, 5" minimum, portrait lock, no tablet v1
- **Performance:** <500ms home render, virtualised lists, <25MB APK
- **Accessibility minimum:** 44dp targets, WCAG AA contrast, screen reader labels

---

## 11. NETWORK DEPENDENCY STATEMENT

SpendSense's core tracking, classification, budgeting, and analysis features work entirely offline with no server dependency. Optional AI-assisted features use network calls to the user's chosen provider when enabled. The app never feels broken without internet — AI features degrade to rule-based and pattern-based alternatives.

---

## 12. SCOPE EXCLUSIONS

Deferred to implementation phase:
- Exact pixel specifications
- Animation and transition design
- Dark mode
- Illustrations and marketing assets
- Bank balance trend (explicitly deferred out of v1)
