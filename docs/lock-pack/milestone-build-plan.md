# Milestone Build Plan

Status: Active
Purpose: Define the safest implementation order for SpendSense v1 given available resources.

## Resource Reality

Current real resources:

- Founder: one person
- Phone for testing: Google Pixel 8
- Laptop: Asus VivoBook
- Budget: effectively zero
- Infra: free/local-first only

This means the build plan must:

- reduce rework
- maximize local testing
- avoid paid infrastructure
- avoid dependencies that cannot be validated by one device
- prefer staged proof over broad simultaneous building

## Delivery Philosophy

We do not build the whole app at once.

We build in risk order:

1. foundations that can corrupt truth if wrong
2. systems that affect capture and correctness
3. systems that affect understanding and UX
4. optional or richer layers later

## Phase 0: Workspace Stabilization

Goal:
Make the workspace safe enough to start real implementation.

Outputs:

- Lock Pack established
- legacy code disposition decided
- source-of-truth docs verified
- implementation milestones defined

Risks addressed:

- memory drift
- accidental reuse of failed code
- future ideas leaking into v1
- testing not being tracked

## Phase 1: Core Truth Engine Foundation

Goal:
Make sure the app can represent money correctly before building polished UI.

Priority systems:

1. distribution architecture split
2. 6-axis transaction model
3. storage schema
4. source-trust skeleton
5. quarantine skeleton

Primary coverage rows:

- COV-01
- COV-02
- COV-03
- COV-04

Must-go-right risks:

- double-counting
- failed transactions counted as spend
- suspicious items entering totals
- architecture mixing Play and sideload behavior

## Phase 2: Capture and Classification Loop

Goal:
Catch transactions and establish the learning loop.

Priority systems:

1. notification detection path
2. sideload SMS path
3. duplicate handling
4. classification state handling
5. purpose capture prompt delivery

Primary coverage rows:

- COV-03
- COV-04
- COV-05

Must-go-right risks:

- missed detection
- notification spam
- learning loop collapse
- prompt backlog explosion

## Phase 3: Identity and Liability Systems

Goal:
Handle the hard money cases that most apps get wrong.

Priority systems:

1. self-identity graph
2. self-transfer detection
3. credit card liability ledger
4. cash wallet

Primary coverage rows:

- COV-07
- COV-09
- COV-10

Must-go-right risks:

- self-transfers shown as spend
- card spend and card bill both counted
- ATM withdrawal treated as spend

## Phase 4: Truth Surfaces

Goal:
Expose the money picture honestly to the user.

Priority systems:

1. Home summary
2. Transactions list and detail view
3. Money tab
4. unified badges and confidence display

Primary coverage rows:

- COV-08
- COV-09
- COV-12

Must-go-right risks:

- false confidence on Home
- hidden liabilities
- quarantine mixed into the normal flow

## Phase 5: Privacy, Constraints, and AI Optionality

Goal:
Make the app resilient and trustworthy in real device conditions.

Priority systems:

1. onboarding and permission copy
2. platform constraint UX
3. AI settings and provider abstraction
4. AI-off mode sanity

Primary coverage rows:

- COV-11
- COV-13
- COV-14

Must-go-right risks:

- dishonest permission copy
- silent failure when listener breaks
- app seeming broken without AI

## Phase 6: Hardening and Performance

Goal:
Make the product stable enough for serious real-world use.

Priority systems:

1. performance on Pixel 8
2. list scale
3. prompt frequency sanity
4. edge-case bug fixing
5. regression testing

Primary coverage rows:

- COV-15
- all test ledger rows touched so far

## Milestone Rule

No milestone is "done" just because code exists.

A milestone is done only when:

1. relevant coverage rows are updated
2. relevant tests are marked pass or fail with notes
3. known gaps are written down

## Recommendation For The First Real Build Milestone

Start with:

- COV-01 distribution architecture
- COV-02 transaction model
- COV-03 detection/lifecycle skeleton
- COV-04 source trust + quarantine skeleton

This is the correct first move because if these are wrong, every later screen becomes misleading.
