# SpendSense Lock Pack

Status: Active
Built on: 2026-03-28
Source basis: Locked Sections 1-11 in `docs/design/`

## Purpose

This Lock Pack exists so SpendSense is built from files, not memory.

It solves four risks:

1. Claude or any coding assistant may forget locked decisions.
2. The founder may not remember every detail during later implementation.
3. Future-version ideas may leak into v1 unless they are tracked separately.
4. Testing can become vague unless it is captured at the same time as design.

## Golden Rule

The canonical product truth is:

- [section-1-primary-customer.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\design\section-1-primary-customer.md)
- [section-2-problems-we-are-solving.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\design\section-2-problems-we-are-solving.md)
- [section-3-competitor-research-and-gap-analysis.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\design\section-3-competitor-research-and-gap-analysis.md)
- [section-4-features-and-money-logic.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\design\section-4-features-and-money-logic.md)
- [section-5-ux-design-philosophy.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\design\section-5-ux-design-philosophy.md)
- [section-6-logic-behind-each-feature.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\design\section-6-logic-behind-each-feature.md)
- [section-7-technical-challenges-assessment.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\design\section-7-technical-challenges-assessment.md)
- [section-8-deployment-analysis.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\design\section-8-deployment-analysis.md)
- [section-9-government-regulations.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\design\section-9-government-regulations.md)
- [section-10-milestones.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\design\section-10-milestones.md)
- [section-11-profit-model-and-target-numbers.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\design\section-11-profit-model-and-target-numbers.md)

This Lock Pack translates those sections into implementation guardrails, traceability, coverage tracking, and test tracking.

If there is ever a conflict:

1. Locked section text wins over memory.
2. Lock Pack operational files must be updated to match the locked section.
3. Code must then be updated to match the lock.

## Who Owns The Lock Pack

Codex owns creation and verification of the Lock Pack.

Best practice:

- Codex creates and maintains the Lock Pack.
- Claude can implement against it.
- Claude should not be trusted to redefine it from memory.
- Any change to locked logic must be approved explicitly and then reflected in the locked section plus the Lock Pack.

## Files

- [implementation-constitution.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\implementation-constitution.md)
  Hard non-negotiables for all coding work.

- [requirements-traceability-matrix.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\requirements-traceability-matrix.md)
  Maps locked concepts to implementation consequences and primary test areas.

- [implementation-coverage-ledger.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\implementation-coverage-ledger.md)
  Tracks whether each major locked system is not started, in progress, built, and verified.

- [test-ledger.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\test-ledger.md)
  Tracks what must be tested, how to test it, and expected results.

- [future-version-register.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\future-version-register.md)
  Separate holding area for future-version ideas so v1 stays clean.

- [development-workflow.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\development-workflow.md)
  Exact workflow for using this pack with Claude or any coding assistant.

- [claude-collaboration-brief.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\claude-collaboration-brief.md)
  Explain to Claude how the workspace is governed and what implementation behavior is required.

- [claude-code-capability-profile.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\claude-code-capability-profile.md)
  Official-capability interpretation of Claude Code for this workspace.

- [codex-operating-brief.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\codex-operating-brief.md)
  Robust operating standard for Codex inside the SpendSense project.

- [release-channel-strategy.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\release-channel-strategy.md)
  Dual-flavor build and release order, plus tester-build shutdown strategy.

- [test-evidence-capture-plan.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\test-evidence-capture-plan.md)
  How testing evidence is captured, exported, and reviewed without a backend.

- [build-iteration-control.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\build-iteration-control.md)
  Build IDs, manifests, artifact naming, expiry rules, and tester iteration discipline.

- [document-consumption-protocol.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\document-consumption-protocol.md)
  Reading protocol for long files so lock-critical content is not missed.

- [builds\README.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\builds\README.md)
  Folder rule for build manifests and release notes.

- [test-runs\README.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\test-runs\README.md)
  Folder rule for exported test evidence bundles.

- [build-manifest-template.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\build-manifest-template.md)
  Reusable template for each installable build.

- [test-run-template.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\test-run-template.md)
  Reusable template for each founder or beta test run.

- [feedback-intake-template.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\feedback-intake-template.md)
  Reusable template for collecting tester reports without losing build context.

- [testing-operations-workflow.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\testing-operations-workflow.md)
  Exact testing loop between Claude, Charan, the app, and Codex.

- [evidence-bundle-contract.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\evidence-bundle-contract.md)
  Minimum structure diagnostic exports must satisfy.

- [document-management-system.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\document-management-system.md)
  Rules for managing a growing document set cleanly.

- [measurement-and-telemetry-decision.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\measurement-and-telemetry-decision.md)
  Separates diagnostic evidence from public telemetry and defines the current measurement limits.

- [implementation-start-gate-review.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\implementation-start-gate-review.md)
  Current decision on whether the project can leave concept freeze and what must happen first.

- [milestone-brief-m0-workspace-stabilization.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\milestone-brief-m0-workspace-stabilization.md)
  Exact first milestone brief for moving into execution safely.

## How We Use This Pack

Before any development milestone:

1. Pick the feature or system to build.
2. Find the applicable lock IDs in the traceability matrix.
3. Read the original locked section(s).
4. Give Claude only the relevant lock context plus the implementation task.
5. Require Claude to state which lock IDs it is implementing.
6. Decide which flavor(s), build track, and evidence mode are involved.

After implementation:

1. Update the implementation coverage ledger.
2. Update or expand the relevant test cases in the test ledger.
3. Create a build manifest if the milestone produces an installable APK.
4. Test the feature against the expected results.
5. Export evidence for meaningful test runs.
6. Mark each test pass/fail with notes.

If a new idea appears during v1 development:

1. Do not silently implement it.
2. Put it in the future-version register.
3. Only move it into v1 if it is explicitly approved and the locked docs are updated.

## Immediate Next Use

Use this Lock Pack as the implementation operating system now that the full 11-section Concept Freeze is locked.
