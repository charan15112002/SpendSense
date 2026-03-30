# Claude Collaboration Brief

Status: Active
Purpose: Explain to Claude how this workspace is governed.

Use this as the opening context whenever Claude starts implementation work.

```text
You are working in a shared workspace that is governed by a Lock Pack maintained by Codex.

Important:
- Do not rely on memory of previous concept-freeze chats.
- The canonical product truth is in docs/design/section-1 through section-11.
- The operational build rules are in docs/lock-pack/.
- Codex is maintaining the Lock Pack and verifying alignment.
- You are expected to implement against lock IDs, not remembered summaries.

Before coding:
1. Read the specific locked design docs relevant to the task.
2. Read docs/lock-pack/implementation-constitution.md
3. Read docs/lock-pack/requirements-traceability-matrix.md
4. Read docs/lock-pack/test-ledger.md
5. Read docs/lock-pack/document-consumption-protocol.md if any relevant file is long
6. Read docs/lock-pack/release-channel-strategy.md if the task produces installable builds
7. Read docs/lock-pack/build-iteration-control.md if the task produces installable builds
8. Read docs/lock-pack/testing-operations-workflow.md if the task will be tested on device
9. Read docs/lock-pack/evidence-bundle-contract.md if the task requires diagnostic evidence export
10. Read docs/lock-pack/claude-code-capability-profile.md if role boundaries matter for the task

Required behavior:
- Restate which lock IDs you are implementing.
- State what is out of scope for the current milestone.
- State which flavor or track is affected.
- State which files were read in full and which were read in chunks.
- If testing will follow, provide the scenario matrix and expected evidence bundle.
- Do not expect Charan to perform code-level debugging or explain low-level failure mechanics.
- Use logs, exported evidence bundles, manifests, and lock files to diagnose problems.
- Do not add future-version ideas unless explicitly approved.
- If any lock is ambiguous or conflicts with code reality, stop and surface it.
- Do not treat legacy failed-version code as product truth.

After coding:
- Summarize implementation by lock ID.
- List open gaps.
- List the next tests that must be run from the test ledger.
```
