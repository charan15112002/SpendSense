# Test Ledger

Status: Active
Purpose: Track what must be tested, how to test it, and what counts as correct behavior.

Status values:

- Not started
- Ready
- Pass
- Fail
- Blocked

## Core Functional Tests

| Test ID | Lock IDs | Area | Preconditions | Test Procedure | Expected Result | Status | Notes |
|---|---|---|---|---|---|---|---|
| T-DET-01 | S2-P01, S4-M1 | Play Store detection | Play build, notification access granted | Make a normal UPI payment from a supported app | Transaction is captured once, with correct amount, source, timestamp | Not started | |
| T-DET-02 | S4-M2 | Sideload SMS detection | Sideload build, SMS permission granted | Make a bank-notified payment and receive SMS | Transaction is captured from SMS path and not duplicated | Not started | |
| T-DET-03 | S2-P04, S4-M3 | Failed transaction handling | Detection enabled | Trigger a failed or declined payment | Item does not enter spend totals | Not started | |
| T-DET-04 | S2-P04, S4-M3 | Reversed/refunded handling | Detection enabled | Create a payment that later reverses or refunds | Spend totals reflect the locked reversal/refund rules | Not started | |
| T-DET-05 | S2-P04, S4-M9 | Duplicate detection | Detection enabled | Produce same event via notification and SMS | App stores one logical transaction, not two | Not started | |
| T-DET-06 | S4-M6 | Self-transfer handling | Identity graph configured | Transfer money between two own accounts | Item is marked self-transfer and excluded from spend/income totals | Not started | |
| T-DET-07 | S4-M5 | Credit card spend vs bill payment | Card configured | Make card spend, then pay card bill | Spend counted once; bill payment settles liability only | Not started | |
| T-DET-08 | S4-M10 | Cash withdrawal to cash wallet | Detection enabled | Withdraw cash from ATM | Cash wallet is created; withdrawal is not counted as spend | Not started | |
| T-DET-09 | S6-L2 | Unverified-source package handling | Detection enabled, custom source settings available | Send one notification from a non-whitelisted package and one from a user-added unverified source | Non-whitelisted package is discarded; user-added unverified source enters low-trust review path only | Not started | |

## Home and Money Truth Tests

| Test ID | Lock IDs | Area | Preconditions | Test Procedure | Expected Result | Status | Notes |
|---|---|---|---|---|---|---|---|
| T-HOME-01 | S5-UX1, S5-UX6 | Home summary honesty | Fresh or low-confidence account | Open Home in Bootstrap phase | Totals are labeled honestly; confidence is visible; missing data is not faked | Not started | |
| T-HOME-02 | S2-P05, S5-UX6 | Earned income confidence | No salary pattern yet | Receive an inflow that may be salary | Earned income is hidden or provisional according to lock rules | Not started | |
| T-HOME-03 | S2-P05, S5-UX6 | Other credits confidence | Have unidentified inflow | Receive refund-like or unknown credit | Unknown inflow is not silently folded into Other credits | Not started | |
| T-HOME-04 | S4-M9, S5-UX7 | Quarantined exclusion | Suspicious item present | Open Home and totals | Quarantined items are excluded and surfaced separately | Not started | |
| T-MONEY-01 | S5-UX5, S4-M5 | Money tab liability surface | Card configured | Open Money tab | Outstanding amount, due date, minimum due are visible and discoverable | Not started | |
| T-MONEY-02 | S4-M10, S5-UX5 | Cash wallet UX | Cash wallet active | Open Money tab, log cash spend | Cash balance updates correctly with low-friction flow | Not started | |

## Prompt Delivery Tests

| Test ID | Lock IDs | Area | Preconditions | Test Procedure | Expected Result | Status | Notes |
|---|---|---|---|---|---|---|---|
| T-PRM-01 | S2-P07, S5-UX8 | Default real-time prompt path | SpendSense not visible | Make an unclassified spend | Smart notification is used by default | Not started | |
| T-PRM-02 | S5-UX8 | In-app prompt guard | SpendSense currently visible | Trigger a new unclassified transaction while reviewing app | Inline prompt appears; no duplicate notification appears | Not started | |
| T-PRM-03 | S2-P14, S5-UX8 | Burst handling | Make 3+ transactions quickly | Observe prompt behavior | Per-transaction spam is suppressed; batched handling is used | Not started | |
| T-PRM-04 | S2-P14, S5-UX8 | Quiet hours handling | Quiet hours configured | Make unclassified payment during quiet hours | No intrusive real-time prompt; item is queued for later | Not started | |
| T-PRM-05 | S5-UX8 | Floating prompt safety gate | Floating prompt enabled | Trigger transaction during fullscreen app or call | Floating prompt does not appear unsafely; fallback path is used | Not started | |
| T-PRM-06 | S2-P14, S5-UX8 | Backlog behavior | Leave items unclassified | Wait through 24h, 7d, 30d checkpoints | Queue, backlog, and final archive flow follow locked rules | Not started | |
| T-PRM-07 | S6-L3 | Unclassified aging exactness | Create an unclassified transaction and do not resolve it | Verify 24h queue state, 7d backlog move, and 30d classify-or-archive prompt | Aging flow matches locked lifecycle exactly | Not started | |

## Trust, Confidence, and UX Tests

| Test ID | Lock IDs | Area | Preconditions | Test Procedure | Expected Result | Status | Notes |
|---|---|---|---|---|---|---|---|
| T-TRUST-01 | S5-UX7 | 5-state badge system | Have examples of each state | Inspect list and detail screens | Confirmed, Learned, Suggested, Unclassified, Quarantined are visually distinct and coherent | Not started | |
| T-TRUST-02 | S5-UX9 | Trust-ramp progression | Simulate user across thresholds | Progress through phases with varying evidence | Unlocks happen by evidence plus soft floors, not by time alone | Not started | |
| T-TRUST-03 | S5-UX9 | Low-volume user protection | Sparse usage profile | Use app lightly over time | User is not trapped forever in early phases | Not started | |
| T-TRUST-04 | S2-P11, S5-UX3 | Zero-guilt language | Review UI copy | Inspect alerts, summaries, empty states, cards | No guilt, shaming, or manipulative scoring language appears | Not started | |
| T-TRUST-05 | S6-L4 | AI cannot rescue low-trust authenticity | Construct or encounter a structurally low-trust fake-like message while AI is enabled | Observe handling path | Item remains quarantined or rejected; AI does not promote it into normal flow | Not started | |

## Privacy and AI Tests

| Test ID | Lock IDs | Area | Preconditions | Test Procedure | Expected Result | Status | Notes |
|---|---|---|---|---|---|---|---|
| T-PRIV-01 | S2-P08, S4-M11 | Play onboarding honesty | Fresh install | Read notification permission explanation | Copy matches OS-level truth plus local filtering/storage behavior | Not started | |
| T-PRIV-02 | S2-P08, S4-M11 | Sideload onboarding honesty | Sideload install | Read SMS permission explanation | Copy matches broad permission plus local filtering/storage behavior | Not started | |
| T-PRIV-03 | S4-M7, S4-M8, S4-M11 | AI-off mode | No AI configured | Use core product normally | App works locally without appearing broken | Not started | |
| T-PRIV-04 | S4-M11 | AI enable disclosure | Open AI settings and enable provider | Review disclosure text | Sent fields and never-sent fields match locked payload rules | Not started | |
| T-PRIV-05 | S4-M11 | Non-financial data retention | Trigger unrelated notifications/SMS | Inspect stored data if possible | Non-financial content is discarded and not retained | Not started | |

## Platform Constraint Tests

| Test ID | Lock IDs | Area | Preconditions | Test Procedure | Expected Result | Status | Notes |
|---|---|---|---|---|---|---|---|
| T-PLAT-01 | S4-M12, S5-UX10 | Notification access revoked | App previously working | Revoke notification access and reopen app | Persistent warning shown; no silent failure | Not started | |
| T-PLAT-02 | S4-M12, S5-UX10 | OEM battery kill guidance | Device with aggressive battery management | Simulate listener stoppage | User sees helpful fix path | Not started | |
| T-PLAT-03 | S4-M12, S5-UX10 | Listener rebind failure | Force service disruption | Return to app | Restart/rebind guidance behaves correctly | Not started | |
| T-PLAT-04 | S4-M12, S5-UX10 | Work profile limitation | Device with work profile | Place bank app in work profile | UX warns accurately about limitation | Not started | |
| T-PLAT-05 | S4-M12, S5-UX10 | Low-RAM Android Q and below | Unsupported device | Install app and open onboarding | App clearly switches to manual-only mode and does not pretend auto-tracking is available | Not started | |

## UX and Device Baseline Tests

| Test ID | Lock IDs | Area | Preconditions | Test Procedure | Expected Result | Status | Notes |
|---|---|---|---|---|---|---|---|
| T-UX-01 | S5-UX1, S5-UX2 | Home speed and key action friction | Mid-range Android device | Open Home, classify a transaction, open Money tab | Core answer is visible quickly; key task stays within 3 taps | Not started | |
| T-UX-02 | S1-C2, S5-UX3 | Indian formatting and cultural tone | App populated with sample real data | Inspect amounts, dates, labels, and alerts | Rupee formatting, lakh/crore logic, and cultural tone match the lock | Not started | |
| T-UX-03 | S5-UX4, S5-UX5 | Navigation discoverability | App populated with cards, cash, quarantine, pending items | Traverse the app without guidance | User can discover liabilities, pending actions, and quarantine logically | Not started | |

## Maintenance Rule

Whenever a new concept is locked later:

1. Add or update tests here immediately.
2. Do not wait until code exists.
3. Keep the test procedure tied to the lock that created it.
