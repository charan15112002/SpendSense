# Future Version Register

Status: Active
Purpose: Keep future-version ideas separate from v1 so they are not accidentally built early.

Status values:

- Parked
- Approved for later
- Pulled into active planning
- Dropped

| Item ID | Feature / Idea | Source | Why Not v1 | Earliest Target | Status | Notes |
|---|---|---|---|---|---|---|
| FUT-01 | Account Aggregator integration | Section 4 | Delayed, consent-heavy, not real-time enough for v1 entry wedge | Post-v1 | Parked | Revisit after detection engine stabilizes |
| FUT-02 | Shared expense tracking | Section 4 | Adds collaboration complexity beyond core truth engine | Phase 2 | Parked | Includes group settlements beyond base support |
| FUT-03 | Family dashboard | Section 4 | Multi-user model is not part of v1 | Phase 3 | Parked | Requires privacy and account-linking decisions |
| FUT-04 | Investment dashboard | Section 4 | v1 tracks money movement, not portfolio performance | Phase 2 | Parked | Keep flows separate from valuation features |
| FUT-05 | Bill reminders | Section 4 | Useful, but not core to first truth-engine build | Phase 2 | Parked | Can leverage recurring detection later |
| FUT-06 | Advanced budget methodologies | Section 4 | v1 should avoid overcomplicating budget UX | Phase 2 | Parked | Envelope, zero-based, goal-first, etc. |
| FUT-07 | Predictive alerts | Section 4 | Requires mature history and confidence | Phase 3 | Parked | Only after evidence thresholds are stable |
| FUT-08 | Tax helper | Section 4 | Out of v1 scope and high-risk if inaccurate | Phase 3 | Parked | Keep finance truth separate from tax promises |
| FUT-09 | Multi-currency | Section 4 | Not required for India-first v1 | Later | Parked | Revisit if user base justifies |
| FUT-10 | Cloud backup / sync | Section 4 implied | Adds trust and security burden beyond local-first v1 | Later | Parked | Must not break local-first principle |
| FUT-11 | On-device AI provider | Section 4 | Not yet practical enough for v1 constraints | Later | Parked | Keep provider abstraction ready |
| FUT-12 | App-managed AI provider | Section 4 | Revenue and infra needed first | Later | Parked | v1 should work with AI off |
| FUT-13 | Regional language support | Section 5 | Valuable, but English-first v1 is locked | Phase 2 | Parked | Layout must remain ready |
| FUT-14 | Dark mode | Section 5 | Explicitly deferred | Phase 2 | Parked | Not part of current design lock |
| FUT-15 | Tablet optimization | Section 5 | Explicitly deferred | Later | Parked | Phone-first only for v1 |
| FUT-16 | Landscape mode | Section 5 | Explicitly deferred | Later | Parked | Portrait-only in v1 |
| FUT-17 | Rich illustration / motion language expansion | Section 5 | Not part of current concept freeze | Later | Parked | Keep trust-first utility feel first |

## Rule For New Ideas

Whenever a future idea comes up during v1 development:

1. Add it here before it is forgotten.
2. Do not put it straight into implementation.
3. Only promote it if it receives explicit approval and the locked docs are updated.
