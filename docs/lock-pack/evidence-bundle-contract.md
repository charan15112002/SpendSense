# Evidence Bundle Contract

Status: Active
Purpose: Define the minimum structure and semantics of diagnostic evidence so Claude and Codex can analyze app behavior without relying on vague human explanation.

## 1. Contract Goal

An evidence bundle must be rich enough that a reviewer can answer:

- what happened
- in what order
- why the app made each decision
- what changed in stored state
- what appeared to the user

## 2. Mandatory Bundle Components

Every meaningful diagnostic export must include:

- `manifest.json`
- `event-timeline.jsonl`
- `decision-trace.jsonl`
- `ui-surface-trace.jsonl`
- `platform-trace.jsonl`

Optional where relevant:

- `raw-financial-source/`
- `screenshots/`
- `user-notes.md`

## 3. Manifest Requirements

The manifest must contain:

- build ID
- flavor
- track
- version name
- version code
- diagnostic mode
- tester alias
- device model
- Android version
- milestone or fix reference
- start time
- end time

## 4. Event Timeline Requirements

The event timeline should include ordered events such as:

- notification received
- SMS received
- package or sender matched
- filter discard
- parser selected
- transaction created
- dedup merged
- confidence assigned
- quarantine applied
- prompt issued
- user action received
- totals recomputed

## 5. Decision Trace Requirements

Each decision trace entry should make it possible to inspect:

- rule or function name
- inputs considered
- output chosen
- confidence or trust score
- exclusion reason if not shown

## 6. UI Surface Trace Requirements

The bundle should record what the app decided to show on key surfaces:

- Home total inclusion or exclusion
- badge or chip state
- Money tab liability display
- quarantine surfacing
- pending queue entry

## 7. Platform Trace Requirements

Record platform-level events such as:

- notification access granted or revoked
- listener bound or unbound
- rebind attempt
- background restriction suspicion
- overlay available or unavailable

## 8. Privacy Rule

This contract does not override the product privacy model.

Therefore:

- non-financial raw content must not be stored
- raw financial content may be stored locally only within locked product limits
- exported bundles for external testers must respect opt-in and diagnostic-mode boundaries

## 9. Review Rule

Claude and Codex should treat any bundle missing mandatory components as incomplete.

If incomplete:

- do not draw strong conclusions
- request the missing evidence or rerun the test

## 10. Mandatory Rules

- Evidence must be time-ordered.
- Evidence must be tied to one build ID.
- Evidence must be rich enough to reconstruct app decisions.
- Missing evidence must be treated as a test-process failure, not guessed around.
