# Release Channel Strategy

Status: Active
Purpose: Define how SpendSense should build, test, and release its Play Store and sideload variants without flavor drift or launch confusion.

## 1. Core Rule

SpendSense is one product with one shared core and two distribution flavors:

- `playstore`
- `sideload`

Both flavors must build from the start of implementation.
Neither flavor may be treated as an afterthought.

## 2. Recommended Build and Release Order

### Build Order

Build both flavors from M1 onward.

Reason:

- shared money logic must stay identical
- Play-only and sideload-only permissions must stay separated
- early flavor drift is expensive to fix later

### External Release Order

Recommended order:

1. Founder local testing of both flavors
2. Controlled sideload testing with close circle
3. Play closed testing when M6-level compliance and onboarding are stable
4. Public channel decision after beta evidence and legal gates

Reason:

- sideload gives faster iteration and no store-review delay
- Play closed testing is still important because Play-specific friction is real
- building both continuously is safer than releasing both publicly at the same time

## 3. Channel Policy

### Play Store Flavor

Use for:

- notification-first distribution
- Play policy validation
- closed testing if account rules apply
- eventual public listing if approved

Constraints:

- no `READ_SMS`
- review is non-public and case-by-case
- account-specific closed-testing requirements may apply

### Sideload Flavor

Use for:

- SMS-first detection plus notification secondary
- faster controlled distribution
- founder and trusted-tester iteration
- fallback launch path if Play review is delayed or denied

Constraints:

- manual install friction
- no staged rollout control
- weaker update discipline unless build iteration rules are enforced

## 4. Safety Rule for Dual-Flavor Delivery

For every milestone that produces installable code:

1. build both flavors
2. install-test at least the flavor touched most by the milestone
3. record flavor-specific differences in the build manifest
4. never assume a change in shared code is safe for both flavors without checking

## 5. Recommended Public Launch Posture

Default recommendation:

1. keep both flavors buildable
2. use sideload for faster controlled iteration
3. use Play closed testing as soon as the app is stable enough
4. decide public order later:
   - Play + sideload together
   - sideload-first
   - Play-first if evidence strongly supports it

This decision should not be frozen before beta evidence exists.

## 6. Can SpendSense Disable Installed Tester Builds?

### Honest Answer

Not reliably for all installed devices without the app checking some external control signal.

Changing a Play test track does not guarantee immediate shutdown of already installed copies.
Sending a new APK does not disable older sideload APKs already installed on someone else's phone.

### What Is Safe and Implementable

For pre-public builds, use controlled expiry instead of a hidden remote kill switch.

Recommended rule:

- founder-local builds: may expire quickly
- close-circle builds: may expire after a short test window
- wider-beta builds: may expire after a longer test window
- public builds: do not expire

Expiry is enforceable locally and does not require a backend.

### Optional Advanced Control

A remote kill switch is possible only if the app checks a network-hosted policy file or control endpoint.

Tradeoff:

- gives stronger tester control
- introduces network dependency for test builds
- adds compliance and failure-mode complexity

Recommendation:

- do not build a public remote kill switch into v1
- if needed, allow a test-build-only policy check later as a controlled milestone
- until then, use expiring builds plus clear build IDs

## 7. Release Risks and Countermeasures

| Risk | Why It Matters | Countermeasure |
|---|---|---|
| Flavor drift | Play and sideload behave differently by accident | Build both every installable milestone |
| Wrong external order | Public launch chosen before evidence exists | Keep public order as a gated decision |
| Old tester APKs remain active | Feedback mixes old and new behavior | Use build expiry and strict build IDs |
| Tester confusion | "Which APK is this?" becomes unclear | Every APK must carry visible build ID and flavor label |
| Play delay blocks progress | Store review or closed-testing rules slow launch | Keep sideload path healthy in parallel |

## 8. Mandatory Rules

- Build both flavors from M1 onward.
- Do not release externally without a build ID and manifest.
- Do not depend on Play approval for all progress.
- Do not promise remote disable unless a real control mechanism exists.
- Use build expiry for controlled testing if shutdown control is needed.
