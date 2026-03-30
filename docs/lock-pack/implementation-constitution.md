# Implementation Constitution

Status: Active
Applies to: All future SpendSense development work

## Purpose

These are the build-time rules that cannot be violated without explicit approval.

## Non-Negotiables

1. Build from locked documents, not memory.
   Every implementation task must cite the relevant lock IDs from the Lock Pack.

2. No v1 scope drift.
   If a feature is not locked for v1, it does not get built. It goes to the future-version register.

3. Distribution architecture is split.
   Play Store build is notification-first.
   Sideload build is SMS-first with notification secondary.

4. The Section 4 money model is canonical.
   Every transaction must obey the 6-axis model:
   `status`, `flow`, `economic_type`, `payment_instrument`, `liability_effect`, `confidence`.

5. No false confidence.
   If the app is uncertain, the UI must show uncertainty.
   If data is missing, the app must not pretend otherwise.

6. Suspicious items stay out of the normal money picture.
   Quarantined items are never counted in totals until the user confirms them as real.

7. Credit card logic must never double-count.
   Card spend is spending.
   Card bill payment is liability settlement.
   They must never both inflate spend totals.

8. Self-transfer logic requires the identity graph.
   Do not implement transfer classification as a shallow string match.

9. Prompting must respect attention.
   Smart notifications are the default real-time path.
   In-app inline prompts only apply when SpendSense is already visible.
   Floating prompts are opt-in only.

10. Privacy promises must stay technically honest.
    By default, data stays on-device.
    There is no SpendSense server in v1.
    Optional AI is allowed only within the locked payload rules.

11. Non-financial data must not be retained.
    Broad OS permissions may expose more data, but the app must filter locally and store only finance-relevant data.

12. Platform constraints must be surfaced in UX.
    Unsupported or degraded scenarios cannot be hidden in implementation only.

13. No demo data.
    If there is no real data, the app must say so honestly.

14. Home is a truth surface, not a decoration surface.
    Totals, labels, confidence, and exclusions must match locked logic exactly.

15. Every feature must be traceable to the locked concept.
    If a feature cannot be traced back to locked Sections 1-5, stop and resolve it before building.

## Build Rule For All Assistants

Before writing code, the assistant must answer:

1. Which lock IDs are being implemented?
2. Which v1 requirements are explicitly out of scope for this task?
3. Which tests from the test ledger must pass before the task is considered done?

If the assistant cannot answer those three questions, it is not ready to code.
