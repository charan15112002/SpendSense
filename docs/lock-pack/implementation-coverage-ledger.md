# Implementation Coverage Ledger

Status: Active
Purpose: Track whether each major locked system has been implemented and verified.

Status values:

- Not started
- In progress
- Built
- Verified
- Blocked

| Coverage ID | System | Lock IDs | Source File(s) | Implementation Status | Test Status | Notes |
|---|---|---|---|---|---|---|
| COV-01 | Distribution architecture and permission split | S4-M1, S4-M2, S4-M12, S5-UX10 | Section 4, Section 5 | Verified | Pass (unit) | M1: Both flavors build. Play=no SMS, Sideload=READ_SMS+RECEIVE_SMS. BuildConfigField DISTRIBUTION set per flavor. Verified by Guardian 2026-03-30. |
| COV-02 | Core transaction model and storage schema | S4-M3, S4-M4, S4-M5 | Section 4 | Verified | Pass (unit) | M1: Full 6-axis schema with CHECK constraints. 31 economic types, all matching Section 4 exactly. CRUD operations. Spend query excludes failed/reversed/pending/self-transfer/credit_card_payment/quarantined. 8 unit tests pass. Verified by Guardian 2026-03-30. |
| COV-03 | Detection, duplicate filtering, and lifecycle handling | S2-P01, S2-P04, S2-P13, S4-M3 | Section 2, Section 4 | Built | Pass (unit), Pending (field) | M2: Code verified by Guardian 2026-03-31 — zero deviations. Full detection pipeline, custom Kotlin, 9-app whitelist, template library, shortcode DB, parser health, basic dedup, phishing defense. 19 new unit tests pass. FIELD TESTS (T1/T2/T11/T12) NOT YET RUN — required M2 exit condition per Section 10. |
| COV-04 | Source trust, quarantine, and fake defense | S2-P12, S4-M9, S5-UX7 | Section 2, Section 4, Section 5 | Verified | Pass (unit) | M1: 6-signal trust scoring skeleton (0-100), all signal weights match Section 4 exactly. Quarantine gate at threshold 24. Quarantined items excluded from spend totals via SQL WHERE clause. 25 unit tests pass (17 trust + 8 quarantine). Verified by Guardian 2026-03-30. |
| COV-05 | Purpose capture and prompting system | S2-P07, S2-P14, S5-UX8 | Section 2, Section 5 | Not started | Not started | Smart notification is default real-time path |
| COV-06 | Pattern memory and adaptive classification | S2-P06, S4-M7, S4-M8 | Section 2, Section 4 | Not started | Not started | Must work with AI off |
| COV-07 | Self-identity graph and self-transfer handling | S4-M6 | Section 4 | Not started | Not started | Required before transfer classification can be trusted |
| COV-08 | Home summary honesty and confidence display | S2-P12, S5-UX1, S5-UX6, S5-UX9 | Section 2, Section 5 | Not started | Not started | Includes confirmed vs estimated and inflow rules |
| COV-09 | Money tab systems: budget, cards, cash wallet | S2-P10, S4-M5, S4-M10, S5-UX5 | Section 2, Section 4, Section 5 | Not started | Not started | Cards and cash are first-class |
| COV-10 | Credit card liability ledger | S4-M5, S5-UX5 | Section 4, Section 5 | Not started | Not started | No double-counting ever |
| COV-11 | Onboarding, permission copy, and privacy UX | S2-P08, S4-M11, S5-UX10 | Section 2, Section 4, Section 5 | Not started | Not started | Must stay technically honest |
| COV-12 | Transaction list, detail view, and badges | S5-UX4, S5-UX7 | Section 5 | Not started | Not started | Unified 5-state model |
| COV-13 | Platform constraint UX and fallback states | S4-M12, S5-UX10 | Section 4, Section 5 | Not started | Not started | Low-RAM, revoked access, OEM kill, work profile |
| COV-14 | AI settings, provider abstraction, and disclosures | S4-M7, S4-M8, S4-M11 | Section 4 | Not started | Not started | No Gemini lock-in |
| COV-15 | Performance, device, and accessibility baseline | S1-C2, S5-UX1, S5-UX2 | Section 1, Section 5 | Not started | Not started | Mid-range Android baseline |

## Update Rule

Any time a coding milestone finishes:

1. Update the relevant row(s).
2. Add code-area notes if useful.
3. Link the milestone to test cases in [test-ledger.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\test-ledger.md).
