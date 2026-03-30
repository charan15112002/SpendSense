# Constraint Resolution Ledger

Status: Active
Purpose: Track when a later locked section constrains, gates, or partially overrides how an earlier locked feature may launch or be implemented.

## Rule

Do not silently resolve cross-section conflicts in code.

Every meaningful tension must be classified as one of:

- Unchanged
- Launch-Gated
- Channel-Gated
- Deferred
- Requires Controlled Revision

## Current Entries

| ID | Earlier Lock Affected | Later Constraint Source | Current Classification | Operational Meaning | Resolution Gate |
|---|---|---|---|---|---|
| CR-01 | Section 4/6 optional AI capability and Section 5 AI UX | Section 9 AI cross-border / SPDI ambiguity | Launch-Gated | AI architecture remains locked and buildable, but safest beta/public posture is disabled by default until legal comfort is reached | Pre-public-launch legal review on AI payload transfer |
| CR-02 | Section 4 M9 / Section 5 delete-all-data full-wipe promise | Section 9 retention-floor concern | Requires Controlled Revision | No hidden retention exception may be implemented. Either full wipe remains valid, or the delete semantics must be explicitly re-locked after legal clarification | Pre-public-launch legal clarification on retention vs delete semantics |
| CR-03 | Section 4 dual distribution architecture | Section 8 Play policy/testing constraints | Unchanged | One codebase / two channels remains correct. Launch order may vary by Play review or testing constraints | Managed via rollout plan, no architecture change needed |

## Usage

Before coding any milestone that touches a constrained area:

1. Read the relevant row here.
2. Read the original locked section text.
3. Treat the classification in this file as binding launch/implementation guidance unless a newer locked section explicitly changes it.
