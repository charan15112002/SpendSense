# Testing Operations Workflow

Status: Active
Purpose: Define the exact loop between Claude, Charan, the app, and Codex so testing does not depend only on human memory or informal feedback.

## 1. Core Principle

Charan is the test executor, not the only source of truth.

The full testing loop is:

1. Claude builds
2. Claude generates the test procedure and scenario matrix
3. Charan performs the procedure on the device
4. The app captures structured evidence
5. Evidence is exported into the workspace
6. Claude analyzes the evidence
7. Codex verifies the analysis against the lock
8. Ledgers are updated

## 2. Required Roles During Testing

### Claude

For every milestone or bug-fix build, Claude must provide:

- feature-specific test procedure
- permutations and combinations to test
- expected results
- evidence mode to enable
- evidence bundle expected contents
- build-specific follow-up questions only if evidence is insufficient

Claude must not say "test it and tell me what happened" as the main plan.

### Charan

Charan must:

- install the identified build
- follow the procedure
- trigger the real scenarios
- export the evidence bundle
- optionally add notes if something felt wrong

Charan should not need to reconstruct the entire internal app state from memory.

### Codex

Codex must:

- verify that Claude's test matrix matches the lock
- verify that evidence is sufficient
- compare Claude's interpretation against locked behavior
- update test, risk, and coverage records

## 3. The Mandatory Testing Loop

### Step 1: Build Brief

Codex prepares milestone or fix brief.

### Step 2: Claude Implementation

Claude codes the scoped work.

### Step 3: Claude Test Package

Before Charan tests, Claude must provide:

- exact feature under test
- build ID
- flavor
- scenario matrix
- ordered steps for each scenario
- expected outcomes
- which evidence bundle to export

### Step 4: Execution on Device

Charan performs the scenarios on the phone.

### Step 5: Evidence Export

The app exports the evidence bundle into the workspace.

### Step 6: Evidence Review

Claude reads:

- build manifest
- evidence bundle
- relevant lock IDs
- relevant test-ledger rows

Claude then explains:

- what the app actually did
- where it matched expected behavior
- where it diverged
- likely cause
- next fix or next test

### Step 7: Codex Verification

Codex checks whether Claude's interpretation actually matches:

- locked product logic
- build manifest
- exported evidence
- compliance and constraint rules

### Step 8: Ledger Update

Codex updates:

- `test-ledger.md`
- `implementation-coverage-ledger.md`
- `risk-register.md`
- `constraint-resolution-ledger.md` if needed

## 4. Scenario Matrix Rule

Claude must generate test scenarios in matrix form, not loose prose.

Each scenario should identify:

- scenario ID
- feature under test
- preconditions
- user action
- source input
- expected state changes
- expected UI result
- expected evidence markers

## 5. Minimum Evidence Expectations

For any meaningful feature test, evidence should be enough to reconstruct:

- what input arrived
- whether it was filtered
- how it was parsed
- how it was classified
- whether it affected totals
- what the UI decided to show

If those cannot be reconstructed, the test evidence is insufficient.

## 6. Rule for Bug Reports

A bug report is not complete unless it includes:

- build ID
- flavor
- device
- evidence bundle or clear reason why none exists

## 7. Mandatory Rules

- Claude must generate the test matrix after coding.
- Charan must execute, not reverse-engineer the app behavior manually.
- The app must provide exportable evidence for controlled testing.
- Claude must interpret the evidence before asking Charan for narrative explanation.
- Codex must verify the interpretation before accepting the conclusion.

## Related Lock Pack Files

- [evidence-bundle-contract.md](evidence-bundle-contract.md) — defines mandatory bundle components and review rules
- [test-evidence-capture-plan.md](test-evidence-capture-plan.md) — defines capture modes (A/B/C) and what data must be recorded
- [test-ledger.md](test-ledger.md) — tracks test status and results
- [milestone-preflight-checklist.md](milestone-preflight-checklist.md) — stop condition if no evidence plan exists
- [risk-register.md](risk-register.md) — risks updated based on test results
