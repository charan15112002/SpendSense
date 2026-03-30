# Build Iteration Control

Status: Active
Purpose: Prevent APK confusion, feedback mix-ups, and loss of traceability across implementation iterations.

## 1. Core Rule

No installable APK is allowed to exist without a unique build identity.

If testers cannot clearly answer "which build is this?", the build process is not under control.

## 2. Build Identity Standard

Every installable build must have:

- build ID
- version name
- version code
- flavor
- track
- build date
- milestone reference

Recommended build ID format:

- `SS-M{milestone}-{track}-{flavor}-{yyyymmdd}-{nn}`

Example:

- `SS-M2-founder-playstore-20260329-01`

## 3. Tracks

Use only these track names:

- `founder-local`
- `close-circle`
- `wider-beta`
- `play-closed`
- `public`

## 4. Artifact Naming

APK file naming should include build identity.

Recommended pattern:

- `spendsense-{build-id}.apk`

Example:

- `spendsense-SS-M2-founder-local-sideload-20260329-01.apk`

## 5. Build Manifest Requirement

Every build must have a matching manifest stored in the workspace.

Store manifests here:

- `docs/lock-pack/builds/`

Minimum manifest fields:

- build ID
- artifact name
- date
- milestone
- flavor
- track
- lock IDs touched
- key code areas changed
- known issues
- expiry policy
- tests to run
- tester audience

## 6. Expiry Policy for Controlled Testing

For controlled testing, build expiry is the preferred shutdown mechanism.

Recommended rule:

- founder-local builds may expire fast
- close-circle builds may expire after a short window
- wider-beta builds may expire after a longer window
- public builds do not expire

Why:

- avoids hidden remote-kill behavior
- keeps tester population on recent builds
- reduces feedback from stale APKs

## 7. Feedback Rule

No feedback should be accepted without a build ID.

If a tester reports a bug without build ID, first identify:

- build ID
- flavor
- track
- device

Then accept the report.

## 8. Iteration Workflow

For every external or founder-distributed build:

1. prepare manifest
2. assemble release APK
3. record checksum if distributed externally
4. install and sanity-check
5. archive artifact and manifest
6. distribute with clear tester instructions
7. collect feedback and evidence against the same build ID

## 9. Workspace Storage Rules

Use:

- `docs/lock-pack/builds/` for manifests and build notes
- `docs/lock-pack/test-runs/` for evidence exported from devices

Do not mix raw build artifacts and evidence files without naming discipline.

## 10. Clean Upgrade Rule

When a build changes:

- schema behavior
- locked money logic
- prompt flow
- diagnostics format
- retention or delete behavior

the next build must:

- have a new build ID
- have updated manifest notes
- clearly state whether uninstall or data reset is required

## 11. What Is Not Allowed

- reusing the same build ID for different APKs
- distributing "latest.apk" without identity
- asking testers to compare builds without telling them the build difference
- mixing Play and sideload feedback without flavor labels
- continuing beta on stale non-expiring internal builds

## 12. Mandatory Rules

- Every APK gets a build ID.
- Every build gets a manifest.
- Every test run references a build ID.
- Expiring builds are preferred over remote disable for controlled testing.
- Build history must be understandable without memory.
