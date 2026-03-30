# Measurement And Telemetry Decision

Status: Active
Purpose: Define what SpendSense can measure under the current locked architecture, what it cannot measure, and what must change if broader public telemetry is added.

## 1. Why This File Exists

The project now has two different evidence needs:

1. **Diagnostic evidence for testing**
2. **Aggregate telemetry for public usage measurement**

These are not the same thing.

Diagnostic evidence is already supported by the Lock Pack and is local-first.
Aggregate public telemetry is **not** currently part of the locked architecture.

## 2. Current Locked Position

Locked Sections 8 and 9 currently assume:

- no SpendSense server in v1
- no analytics service in v1
- local-first data model
- explicit privacy honesty

This means public measurement is limited.

## 3. What We Can Measure Today Without Changing The Lock

### Founder / Controlled Beta

We can measure well through:

- exported evidence bundles
- structured test runs
- build IDs
- scenario matrices
- tester-level permissions and platform states

### Play Store Public Channel

We can measure partially through Play Console, including:

- installs
- audience size
- DAU-style store metrics
- crashes / ANRs / vitals
- ratings and review signals

### Sideload Public Channel

We can measure only weak proxies such as:

- website downloads
- update-page visits
- direct feedback volume
- support requests

These are not reliable active-user metrics.

## 4. What We Cannot Measure Reliably Today

Under the current locked architecture, we cannot reliably know:

- exact sideload install count
- exact sideload DAU / MAU
- exact 30-day retention across sideload users
- aggregate permission grant rate for public users across all channels
- exact cross-channel active-user totals

## 5. The Miss We Must Be Honest About

If a design section uses metrics like:

- total public users
- daily active users after 30 days
- public permission grant rate

without separating channel-specific observability limits, it is overstating what the current architecture can know.

## 6. Telemetry Decision Options

### Option A: No Public Telemetry In v1

Meaning:

- keep current lock intact
- rely on Play Console for Play metrics
- rely on beta evidence + sideload proxies elsewhere

Pros:

- safest privacy posture
- no backend
- no extra compliance surface

Cons:

- weak sideload observability
- no exact cross-channel retention metrics

### Option B: Minimal Public Telemetry As A Controlled Revision

Meaning:

- add a narrow measurement service for aggregate usage signals
- no raw notification text
- no raw SMS text
- no full transaction payloads
- only minimal product-health / usage counters

Examples of allowed minimal events:

- app open
- app version / flavor
- notification access granted or not
- listener active or not
- daily heartbeat

Pros:

- real cross-channel usage measurement
- better launch and retention decisions

Cons:

- introduces server or third-party telemetry dependency
- requires privacy-policy and consent updates
- changes the current no-server / no-analytics posture
- creates a new compliance surface

### Option C: Full Analytics / Growth Telemetry

Meaning:

- standard startup analytics stack

Status:

- not recommended for v1
- too far from current trust-first, zero-budget architecture

## 7. Decision Rule

Public telemetry must not be silently added.

If Option B is chosen:

1. update locked Sections 8, 9, and 11
2. update privacy and compliance ledgers
3. define exact event whitelist
4. define consent and disclosure wording
5. define storage / vendor / retention rules

## 8. Current Recommendation

Current safest recommendation:

- keep diagnostic evidence in place for founder and beta testing
- use Play Console metrics for the Play channel
- keep sideload public metrics explicitly approximate
- do not add public telemetry unless the team decides the observability gain is worth the privacy and architecture change

## 9. Mandatory Rules

- Diagnostic evidence and public telemetry must not be confused.
- Public telemetry is not currently part of the locked v1 architecture.
- Any move to add telemetry is a controlled revision, not a silent implementation detail.
