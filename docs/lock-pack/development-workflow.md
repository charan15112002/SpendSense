# Development Workflow

Status: Active
Purpose: Define the safest way to use Claude or any coding assistant after Concept Freeze.

## Recommendation

Best approach:

- Codex maintains the Lock Pack and verifies alignment.
- Claude implements against tightly scoped tasks derived from the Lock Pack.
- The founder tests against the test ledger.

This is better than asking Claude to "remember everything" because it turns memory into a file-driven workflow.

## Standard Workflow For Every Milestone

### Step 1: Choose the milestone

Example:

- Android notification listener foundation
- Transaction model and storage schema
- Home summary and transaction list
- Prompt delivery system

### Step 2: Pull the lock IDs first

Before any coding prompt, identify:

- relevant lock IDs from [requirements-traceability-matrix.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\requirements-traceability-matrix.md)
- relevant systems from [implementation-coverage-ledger.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\implementation-coverage-ledger.md)
- required tests from [test-ledger.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\test-ledger.md)
- release-track rules from [release-channel-strategy.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\release-channel-strategy.md)
- build-identity rules from [build-iteration-control.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\build-iteration-control.md)
- long-file reading rules from [document-consumption-protocol.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\document-consumption-protocol.md)
- testing-loop rules from [testing-operations-workflow.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\testing-operations-workflow.md)
- evidence requirements from [evidence-bundle-contract.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\evidence-bundle-contract.md)

### Step 3: Give Claude a constrained build brief

Use this pattern:

```text
Implement milestone: [name]

You must build only against these lock IDs:
- [ID]
- [ID]
- [ID]

Canonical source files:
- docs/design/section-X-...
- docs/lock-pack/implementation-constitution.md
- docs/lock-pack/requirements-traceability-matrix.md
- docs/lock-pack/test-ledger.md
- docs/lock-pack/release-channel-strategy.md
- docs/lock-pack/build-iteration-control.md
- docs/lock-pack/document-consumption-protocol.md

Before coding:
1. Restate the lock IDs in your own words
2. State what is explicitly out of scope
3. State which tests must pass
4. State which flavor or track is affected
5. State which locked files were read in full vs in chunks
6. Provide the scenario matrix Charan should execute if testing will follow this build

While coding:
- Do not rely on memory
- Do not add future-version features
- If any lock conflicts or is ambiguous, stop and surface it

After coding:
- Summarize what was implemented against each lock ID
- List what remains not implemented
- List which test cases should be run next
- If an installable build was produced, provide the build ID and expected test evidence to collect
- If testing is required, provide the exact export bundle expected from the app
```

### Step 4: Update the ledgers

After each milestone:

1. Update coverage status.
2. Update or add test cases if the milestone revealed new edge cases.
3. Add any deferred ideas to the future-version register.

### Step 5: Founder testing

You test against the exact cases in the test ledger, not against memory.

Record:

- Pass/fail
- device used
- app variant used (Play-style or sideload)
- build ID
- notes and screenshots if needed
- exported evidence bundle path if captured

## When Claude Must Not Be Trusted Blindly

Do not accept Claude output without ledger checks when:

- the task touches money model logic
- the task touches summary totals
- the task touches confidence or quarantine
- the task touches prompt delivery
- the task touches privacy or AI
- the task touches platform limitations

These are high-risk areas where "almost right" is still wrong.

## What To Do When Claude Makes A Mistake

If Claude drifts:

1. Do not argue from memory.
2. Point it to the exact lock ID and file.
3. Ask for correction only against that lock.
4. If the drift reveals a missing operational rule, update the Lock Pack.

## Success Condition

The goal is not "Claude remembers better."

The goal is:

- locked decisions exist in files
- implementation tasks cite those files
- testing uses those files
- future ideas are tracked separately

That is how we reduce the chance of missing something important during build.
