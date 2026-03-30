# Test Evidence Capture Plan

Status: Active
Purpose: Turn testing into structured evidence so feedback does not depend only on memory or informal explanation.

## 1. Problem This Solves

Founder testing alone can miss details.
Human memory is incomplete.
Important parser decisions, confidence changes, platform failures, and edge-case transitions can be lost unless the app records them deliberately.

SpendSense therefore needs an evidence-capture system for internal and controlled beta testing.

## 2. Core Principle

Testing evidence must be:

- local-first
- explicit
- exportable
- build-specific
- flavor-specific
- readable by Codex and Claude after the run

## 3. Scope Rules

### Always Allowed

- capture finance-relevant events from supported sources
- capture parser decisions
- capture classification decisions
- capture confidence changes
- capture totals-impact decisions
- capture platform/listener events
- capture user actions inside SpendSense

### Never Allowed

- silently upload evidence to a SpendSense server
- persist raw non-financial notifications or personal SMS outside finance-relevant scope
- mix evidence from different builds without a build ID

### External Tester Safety Rule

For family, friends, and wider beta testers:

- diagnostic capture must be opt-in
- the app must explain what is captured
- evidence export must be user-triggered
- non-financial content must still be discarded

## 4. Evidence Modes

### Mode A: Normal Release Logging

Use for:

- public-ready release behavior

Characteristics:

- minimal operational logging
- no verbose timeline capture
- no debugging-only storage

### Mode B: Founder Diagnostic Mode

Use for:

- founder testing
- milestone verification
- field-test sessions

Characteristics:

- full event timeline for finance-relevant processing
- local storage of relevant raw financial source text when allowed by locked product logic
- step-by-step parser and classifier decisions
- build metadata and environment data

### Mode C: Controlled Beta Diagnostic Mode

Use for:

- trusted external testers when a bug is hard to reproduce

Characteristics:

- explicit opt-in
- time-limited session
- exportable bundle
- conservative capture outside supported finance sources

## 5. What Must Be Captured

Each evidence session should capture the following timeline fields.

| Category | Examples |
|---|---|
| Build identity | build ID, version name, version code, flavor, milestone, expiry class |
| Device context | device model, OEM, Android version, locale, battery optimization state |
| Source event | notification or SMS arrival time, package or sender ID, finance-source match result |
| Filter decision | accepted, discarded, quarantined, ignored, reason code |
| Parsing steps | template matched, regex matched, fallback used, extracted values |
| Transaction values | amount, flow, economic type, payment instrument, liability effect, confidence state |
| Trust logic | source-trust inputs, score, quarantine threshold result |
| Dedup logic | candidate match IDs, corroboration result, final kept record |
| Classification logic | rule hit, pattern-memory hit, AI suggested or not, final confidence state |
| User actions | classify, edit, confirm, fake, ignore, delete-all-data, permission grant or deny |
| Surface impact | included in totals, excluded from totals, displayed badge state |
| Platform events | listener unbound, rebind attempt, battery-kill suspicion, permission revoked |
| Failures | parser exception, bridge error, crash, ANR, malformed template |

## 6. What Should Be Stored for Non-Financial Events

To stay consistent with the privacy model:

- do not store raw non-financial notification or SMS text
- store only minimal discard evidence if useful:
  - timestamp
  - source package or sender
  - discard reason
  - optional hash

This is enough to prove filtering behavior without violating the local-first honesty model.

## 7. Evidence Bundle Format

Each export should produce a structured bundle such as:

- `manifest.json`
- `event-timeline.jsonl`
- `parser-decisions.jsonl`
- `classification-decisions.jsonl`
- `platform-events.jsonl`
- `prompt-events.jsonl`
- `screenshots/` if captured
- `notes.md`

Recommended manifest fields:

- build ID
- tester name or alias
- device
- flavor
- test date and time range
- diagnostic mode
- relevant milestone
- tests intended to cover

## 8. Local Storage and Export Rules

- evidence stays on-device until manually exported
- exported bundles are copied into the workspace for review
- evidence must be tied to one build ID only
- evidence capture must be purgeable from the device after export
- no hidden background upload

## 9. Workspace Storage Rules

Store exported evidence here:

- `docs/lock-pack/test-runs/`

One folder or file group per run.

Recommended naming:

- `YYYY-MM-DD_<build-id>_<tester-alias>/`

## 10. How Codex and Claude Use the Evidence

Codex uses evidence to:

- verify milestone behavior against the lock
- identify missing edge cases
- update ledgers and risks

Claude uses evidence to:

- inspect real parser failures
- inspect real event timelines
- implement fixes against actual artifacts instead of vague descriptions

## 11. Required Rule Before External Beta

No external beta should start until we have:

- a documented evidence mode
- an export flow
- a storage location in the workspace
- a build ID attached to the exported run

## 12. Mandatory Rules

- Testing evidence must never depend on memory alone.
- Every meaningful test run must be tied to one build ID.
- Diagnostics for external testers must be opt-in.
- Non-financial raw content must not be stored.
- Evidence must be exportable into the workspace for later analysis.
