# SECTION 10 — MILESTONES

> **Status:** LOCKED on 2026-03-29
> **Dependencies:** Sections 1-9 (all locked), Lock Pack (all active files)
> **Scope:** Convert the locked concept into a sequenced, dependency-aware, gate-respecting implementation plan. This is the operational bridge between Concept Freeze and code. Every milestone, gate, and dependency here traces directly to locked sections or Lock Pack files — nothing is invented.

---

## 1. MILESTONE PHILOSOPHY

### 1.1 Why This Section Exists

Sections 1-9 define **what** SpendSense is. The Lock Pack defines **how** implementation is governed. Neither tells you **in what order to do things, and what must be true before you start the next thing.** That is this section's job.

### 1.2 Governing Principles

1. **Risk-first, not feature-first.** Build the things that can corrupt truth first. If the 6-axis model is wrong, every screen lies. If detection fails silently, the app is dead. Money correctness before polish.

2. **One founder, one phone, zero budget.** Every milestone must be completable by Charan alone, testable on a Pixel 8, and shippable without paid infrastructure. No milestone assumes team capacity that does not exist.

3. **Prove before building on top.** No milestone builds UI surfaces that depend on systems not yet tested. Home screen cannot display spend totals until the transaction model is proven to count correctly.

4. **Gates are not optional.** Field tests, compliance items, and legal opinions are real blockers. Code that is buildable but not launchable must be clearly labeled as such.

5. **Parallel where independent, sequential where dependent.** Two systems that share no data dependency can be built in the same milestone. Two systems where one feeds the other cannot.

6. **The Lock Pack is the operating system.** Every milestone starts with the preflight checklist (milestone-preflight-checklist.md), updates the coverage ledger and test ledger, and respects the implementation constitution. This section defines the sequence; the Lock Pack defines the governance.

---

## 2. MILESTONE SEQUENCING LOGIC

### 2.1 Why This Order

```
M0: Workspace Stabilization
  ↓  (workspace must be safe before any code)
M1: Core Truth Engine
  ↓  (money model must be correct before detection feeds it)
M2: Detection & Field Tests
  ↓  (detection must work before classification operates on it)
M3: Classification & Learning Loop
  ↓  (classification must work before identity/liability systems use it)
M4: Identity & Liability Systems
  ↓  (self-transfers and credit cards must be correct before surfaces show totals)
M5: Truth Surfaces
  ↓  (UI must exist before onboarding/privacy/constraints layer on top)
M6: Privacy, Compliance & AI Optionality
  ↓  (compliance must be met before any external user sees the app)
M7: Hardening & Performance
  ↓  (app must be stable before founder testing with real money)

GATE: Pre-path-freeze field tests (T1, T2, T11, T12) — between M1 and M2
GATE: Pre-beta field tests (T3, T4) — between M6 and beta
GATE: Compliance items COMP-01 through COMP-08 — before beta
GATE: Legal gates COMP-09, COMP-10 — before public launch
```

### 2.2 What Determines the Order

| Ordering Constraint | Source |
|---------------------|--------|
| Money model before anything that displays money | Lock Pack milestone-build-plan.md, Phase 1 |
| Detection before classification | Section 6, System 1 feeds System 3 |
| Field tests T1/T2/T11/T12 before freezing detection implementation path | Section 7, field test gating (3-tier) |
| Identity graph before self-transfer detection | Section 6: self-transfer detection depends on the identity graph being populated first |
| Credit card ledger before Home summary | Section 6, System 6 feeds Home/Money surfaces |
| Dedup before any screen showing transaction counts | Section 6, System 14 prevents double-counting in totals |
| Compliance items before beta distribution | Section 9, compliance roadmap 12.1 |
| Legal gates before public launch | Section 9, compliance roadmap 12.2; Lock Pack constraint-resolution-ledger CR-01, CR-02 |
| Play Store closed testing (14 days) before production submission | Section 8, 2.2 |
| Privacy policy before any external distribution | Section 9, SPDI Rules 2011 Rule 4 |

---

## 3. MILESTONE TABLE

### M0: WORKSPACE STABILIZATION

**Goal:** Make the workspace safe enough to start real implementation.

| Attribute | Value |
|-----------|-------|
| **Type** | Concept + governance milestone |
| **Depends on** | Concept Freeze complete (Sections 1-11 locked) |
| **Lock Pack outputs** | All current Lock Pack files established and verified |
| **Coverage rows** | None (governance, not code) |
| **Duration estimate** | Not estimated (see Section 1.2) |

**What gets done:**
1. Initialize git repository in project root
2. Decide legacy code disposition — archive to `legacy/v1-abandoned/` per Lock Pack recommendation (legacy-code-disposition.md)
3. Verify Lock Pack files are complete and internally consistent
4. Verify all 11 design section files are present and LOCKED
5. Clean project structure: `docs/design/`, `docs/lock-pack/`, clean `src/`, clean `android/`

**Entry conditions:** All 11 CF sections locked.
**Exit conditions:** Git initialized, legacy code archived, Lock Pack verified, workspace clean.

---

### M1: CORE TRUTH ENGINE

**Goal:** The app can represent money correctly before it captures or displays anything.

| Attribute | Value |
|-----------|-------|
| **Type** | Build milestone |
| **Depends on** | M0 complete |
| **Coverage rows** | COV-01 (distribution architecture), COV-02 (transaction model), COV-04 (source trust + quarantine skeleton) |
| **Lock IDs** | M1 (dual distribution), M2 (6-axis model), M5 (trust scoring skeleton), M10 (quarantine skeleton) |
| **Field tests required before starting** | None |
| **Field tests runnable in parallel** | None yet (no listener code exists) |

**What gets built:**
1. React Native project scaffolding with `DISTRIBUTION=playstore|sideload` build flavors
2. Android `build.gradle` productFlavors: `playstore` and `sideload` with manifest overlays (Section 8, 4.1)
3. SQLite schema: transactions table with all 6 axes (status, flow, economic_type, payment_instrument, liability_effect, confidence), plus provenance fields (source_app, raw_text, trust_score, created_at)
4. Transaction creation/read/update/delete operations
5. Source-trust scoring skeleton: 6-signal scoring function returning 0-100 (Section 6, System 5)
6. Quarantine gate: transactions below trust threshold quarantined, never enter spend totals (Section 6, System 9 / M10)
7. Build verification: `assemblePlaystoreRelease` and `assembleSideloadRelease` both produce APKs

**Must-go-right risks (Lock Pack risk-register.md):**
- R-04: Partial money model (6-axis incomplete → wrong totals later)
- R-05: Quarantine leakage (suspicious items in totals)
- R-03: Mixed architectures (Play/sideload behavior mixing)

**Exit conditions:**
- Both APK flavors build and install
- Transaction can be created programmatically with all 6 axes
- Trust score computed correctly for test inputs
- Quarantined transactions excluded from spend sum query
- Coverage rows COV-01, COV-02, COV-04 updated in coverage ledger
- Relevant test ledger items marked pass/fail

---

### M2: DETECTION & PRE-PATH-FREEZE FIELD TESTS

**Goal:** The app captures real transactions from notifications and SMS. Field tests determine architectural decisions before committing to detection path.

| Attribute | Value |
|-----------|-------|
| **Type** | Build + field-test milestone |
| **Depends on** | M1 complete |
| **Coverage rows** | COV-03 (detection/filtering) |
| **Lock IDs** | M1 (dual pipelines C2/C3), Section 6 System 1 |
| **Field tests: pre-path-freeze** | T1, T2, T11, T12 — must complete within this milestone |
| **Field tests: parallel** | T1b, T1c, T5, T13 can start during this milestone |

**What gets built:**
1. Custom Kotlin NotificationListenerService module (Section 7, C3 — own the native layer, no npm packages)
2. RN ↔ Kotlin bridge: `onTransactionDetected()`, `getListenerStatus()`, `rebindListener()` (Section 7, C3)
3. Package whitelist JSON (initial: GPay, PhonePe, Paytm, SBI, HDFC, ICICI, Kotak, Axis)
4. Bank/app-specific regex template library as updatable JSON config (Section 7, C2)
5. Sideload: SMS BroadcastReceiver + SMS backfill module (custom Kotlin, not npm)
6. Sideload: Bank shortcode database JSON
7. Notification filter: non-whitelisted packages → discard immediately (Section 6, System 1)
8. Generic amount extraction fallback for unknown templates
9. Parser health counter: per-bank parse success/fail rate over rolling 7-day window (Section 7, C2)

**Field test execution (pre-path-freeze):**
```
T1:  GPay notification parsing — 50+ real notifications across banks × OEMs
T2:  Listener battery survival — 72-hour soak test on Pixel 8 (+ borrowed Samsung/Xiaomi if available)
T11: Foreground service necessity — with/without persistent notification, compare survival
T12: Listener rebind after kill — force-stop, reboot, battery kill, verify rebind
```

**Decisions these tests produce:**
- T1 → Play Store detection coverage; template library initial quality
- T2/T11 → Foreground service needed? Which OEMs? (per-OEM decision, Section 7 C1)
- T12 → Watchdog mechanism needed? (Section 7 C1 Layer 4)

**Exit conditions:**
- Real transactions detected from GPay/bank notifications on Pixel 8
- Pre-path-freeze test results documented (T1, T2, T11, T12)
- Detection path decisions frozen based on test results
- Sideload SMS detection working with real bank SMS
- Both pipelines (C2, C3) feed transactions into M1's storage layer
- Coverage row COV-03 updated
- Test ledger items TL-01 through TL-04 marked with results

---

### M3: CLASSIFICATION & LEARNING LOOP

**Goal:** Detected transactions get classified, and the system learns from user input.

| Attribute | Value |
|-----------|-------|
| **Type** | Build milestone |
| **Depends on** | M2 complete (detection feeding real transactions) |
| **Coverage rows** | COV-05 (purpose capture), COV-06 (pattern memory) |
| **Lock IDs** | M3 (3-tier intelligence), M8 (reason ontology), Section 6 Systems 3, 8, 11 |
| **Field tests: parallel** | T1b, T1c, T5-T10, T13, T14 can continue |

**What gets built:**
1. Rule engine (Layer A): known merchant → category mapping, keyword rules, 200+ hardcoded merchant database
2. Pattern memory (Layer B — always-on, not AI): VPA → category learned mappings, merchant → purpose learned mappings
3. AI classification interface (Layer C — optional, provider-agnostic): prompt templates per use case matching Section 4 F5 exact payloads
4. 5-state confidence assignment: Confirmed / Learned / Suggested / Unclassified / Quarantined (Section 5)
5. Purpose capture prompt delivery: smart notification primary, floating bubble opt-in, batch digest fallback (Section 5 / Section 6 System 8)
6. Prompt aging model: 24hr → 7 days → 30 days → archive (Section 5 locked model)
7. 6-dimension reason ontology structure: life_area, counterparty_type, intent, recurrence, beneficiary, occasion (M8)
8. Dedup system: fingerprint matching (amount ±₹1 + flow + 30min window), UPI ref tie-breaker, corroboration bonus (Section 6, System 14)
9. User override: edit any classification → creates user_override, feeds pattern memory

**Must-go-right risks:**
- R-08: Spammy prompting (prompt frequency out of control)
- R-04: Classification backlog explosion
- R-06: Double-counting if dedup fails

**Exit conditions:**
- Real transaction gets classified by rule engine without user input (known merchant)
- Unknown merchant triggers purpose capture prompt
- User response feeds pattern memory; same merchant auto-classified next time
- Dedup correctly merges notification + SMS for same transaction (sideload)
- Confidence states display correctly
- AI interface built but AI disabled by default (CR-01 gate)
- Coverage rows COV-05, COV-06 updated

---

### M4: IDENTITY & LIABILITY SYSTEMS

**Goal:** Handle the hard money cases — self-transfers, credit cards, cash.

| Attribute | Value |
|-----------|-------|
| **Type** | Build milestone |
| **Depends on** | M3 complete (classification working, pattern memory active) |
| **Coverage rows** | COV-07 (identity graph), COV-09 (money tab / credit card), COV-10 (credit card ledger) |
| **Lock IDs** | M4 (self-identity graph), M6 (credit card ledger), M7 (cash wallet), Section 6 Systems 4, 6, 12 |

**What gets built:**
1. Self-identity graph: 4 discovery methods (Section 6, System 4)
   - Explicit user input (add own accounts)
   - VPA pattern detection (same VPA local part across handles)
   - Inflow/outflow pattern matching (same counterparty appears as both sender and receiver)
   - Account hint correlation from notifications
2. Self-transfer detection: both parties in identity graph → economic_type = self_transfer, excluded from spend totals (M2, M4)
3. Credit card ledger: each card = separate liability account (M6)
   - Card spend notification → creates_liability (genuine_spend)
   - Bill payment notification → settles_liability (credit_card_payment)
   - Double-count prevention absolute (Section 6, System 6)
4. Cash wallet: per-withdrawal tracking, 3-tap max, optional, never nag (M7, Section 6 System 12)
5. "Delete all data" action: complete wipe, app returns to fresh-install state (Section 4, locked delete-all-data semantics)
   - Identity graph deleted
   - Credit card ledger deleted
   - All transactions (raw + parsed) deleted
   - All learned patterns deleted
   - Warns twice before executing, irreversible

**Must-go-right risks:**
- R-07: Self-transfers shown as spend (identity graph failure)
- R-06: Credit card double-counting (bill payment counted as spending)

**Exit conditions:**
- Self-transfer between own accounts detected and excluded from spend total
- Credit card spend creates liability; bill payment settles it; no double-count
- Cash wallet records ATM withdrawal and manual sub-entries
- Delete all data returns app to fresh-install state (every data category wiped)
- Coverage rows COV-07, COV-09, COV-10 updated

---

### M5: TRUTH SURFACES

**Goal:** Expose the money picture honestly to the user through Home, Transactions, and Money tabs.

| Attribute | Value |
|-----------|-------|
| **Type** | Build milestone |
| **Depends on** | M4 complete (all money logic proven correct before surfaces display it) |
| **Coverage rows** | COV-08 (home summary), COV-09 (money tab), COV-12 (transaction list/detail) |
| **Lock IDs** | Section 5 (all UI/UX), Section 6 Systems 10, 13, 15 |

**What gets built:**
1. Home tab: Spent (confirmed + estimated with honest labels), Earned income (with confidence gates), Other credits (Section 5)
   - Quarantined transactions never in totals
   - Estimated amounts labeled "~"
   - "includes estimated" indicator when applicable
2. Transactions tab: full list with 5-state confidence badges, all 6 axes visible, edit any classification, transaction provenance (source app, raw text, trust score) (Section 5 / Section 4)
3. Money tab: cycle engine (Section 6 System 10), credit card liability display, budget system (Section 6 System 13)
4. Settings tab: notification sources, classification prompts, export, delete all data, permissions status (Section 5)
5. 5-state confidence display per locked Section 5:
   - Confirmed = clean standard state, no badge by default (this is the expected normal)
   - Learned = subtle "Auto" indicator (system classified from pattern memory)
   - Suggested = "Suggested: [category]" chip with lighter/outlined treatment (system's best guess, not confirmed)
   - Unclassified = "Tap to classify" action chip (user input needed)
   - Quarantined = "Suspicious — verify" label with isolated treatment (never in totals, never mixed with normal transactions)
6. Export: CSV with all transaction fields (Section 6, System 15)
7. Platform constraint UX: 5 known scenarios — revoked notification access, battery kill detected, listener gap, work profile unsupported, low-RAM unsupported (Section 5 / Section 7)

**Must-go-right risks:**
- R-09: False confidence on Home (showing "Spent: ₹X" when X is wrong)
- R-14: Hidden liabilities (credit card outstanding not visible)
- R-05: Quarantined items leaking into normal flow

**Exit conditions:**
- Home shows correct spend total matching manually verified transactions
- Quarantined transactions invisible in totals, visible only in dedicated review
- Credit card outstanding visible on Money tab
- Transaction detail shows full provenance
- Export produces valid CSV
- Platform constraint screens trigger correctly when permissions revoked
- Coverage rows COV-08, COV-09, COV-12 updated

---

### M6: PRIVACY, COMPLIANCE & AI OPTIONALITY

**Goal:** Make the app legally distributable and resilient on real devices.

| Attribute | Value |
|-----------|-------|
| **Type** | Build + compliance milestone |
| **Depends on** | M5 complete (surfaces exist to attach consent flows and constraint UX to) |
| **Coverage rows** | COV-11 (onboarding/privacy), COV-13 (platform constraints), COV-14 (AI settings) |
| **Lock IDs** | Section 5 (onboarding), Section 9 (all compliance), M3 (AI optional), M9 (privacy) |
| **Compliance items gated here** | COMP-01 through COMP-08 (all must clear before beta) |

**What gets built:**
1. Onboarding flow: Play Store (notification access only) and sideload (SMS first, then notification) per Section 5
2. Consent copy: plain-language explanation of what data is read, why, and what happens to it — verified against SPDI Rules 2011 requirements (COMP-02)
3. Privacy policy: published in-app and via URL (COMP-01)
4. "View all data" screen in Settings (COMP-03)
5. Data Safety section responses prepared for Play Console (COMP-05)
6. Financial Features declaration prepared for Play Console (COMP-06)
7. AI settings screen: provider selection, API key entry, per-use-case toggles, explicit disclosure of what leaves the device (COMP-07)
8. AI disabled by default — toggle exists but off (Section 9, safest launch posture; CR-01)
9. Local data encryption: SQLite encryption at rest (COMP-08)
10. Battery optimization guidance: reactive, not proactive — triggered only when real problem detected (Section 7 C1, aligned with Section 5)

**Pre-beta field tests (must complete before external distribution):**
```
T3:  Bank SMS format stability — 200+ SMS across 5 banks through parser
T4:  Permission grant rate — 20 beta users, measure notification access grant rate
```

**Compliance checklist (Lock Pack pre-release-compliance-checklist.md):**
- [ ] Privacy policy published
- [ ] Consent copy verified
- [ ] AI disabled by default
- [ ] Delete flow honest (full wipe, no hidden retention)
- [ ] No hidden retention implemented
- [ ] View-all-data surface built
- [ ] Data Safety responses prepared
- [ ] Financial Features declaration prepared
- [ ] Local encryption implemented

**Exit conditions:**
- All COMP-01 through COMP-08 items cleared
- T3 and T4 field test results documented
- If T4 < 60% grant rate → onboarding copy redesigned before beta
- AI toggle exists but is off by default
- Both Play Store and sideload onboarding flows complete
- Coverage rows COV-11, COV-13, COV-14 updated
- App is legally distributable for beta (but NOT public launch — legal gates remain)

---

### M7: HARDENING & PERFORMANCE

**Goal:** Make the app stable enough for real daily use.

| Attribute | Value |
|-----------|-------|
| **Type** | Build milestone |
| **Depends on** | M6 complete |
| **Coverage rows** | COV-15 (performance baseline) |
| **Lock IDs** | Section 5 (performance targets), Section 7 (all remaining challenges) |

**What gets built/verified:**
1. Performance targets on Pixel 8: <500ms home render, <200ms transaction list scroll, <25MB APK (Section 5)
2. Transaction list scale: smooth with 500+ transactions in SQLite
3. Prompt frequency sanity: not more than 3 prompts per hour during active use, batch digest for quiet periods
4. Edge-case regression: all test ledger items re-run
5. Gap detection on app open: check listener binding, show banner if gap detected (Section 7, C1 Layer 3)
6. Failure phrase coverage: full list from v1 learnings (Section 7, C6)
7. Promotional SMS defense: "Save Rs100" not parsed as transaction (Section 7, C6)
8. Release build verification: both flavors, ProGuard enabled, no debug artifacts

**Exit conditions:**
- All performance targets met on Pixel 8
- Full test ledger pass (or documented known-acceptable gaps)
- Coverage row COV-15 updated
- App ready for Phase 0 founder testing

---

## 4. GATES AND BLOCKERS

### 4.1 Field Test Gates

| Gate | Tests | Blocks | Source |
|------|-------|--------|--------|
| **Pre-path-freeze** | T1, T2, T11, T12 | Cannot freeze detection implementation path; can run in parallel with M1 work on other layers | Section 7 field test gating |
| **Pre-beta** | T3, T4 | Cannot distribute to external beta users | Section 7 / Section 8 |
| **Parallel** | T1b, T1c, T5-T10, T13, T14 | Nothing blocked; inform coverage and expand templates | Section 7 |

### 4.2 Compliance Gates

| Gate | Items | Blocks | Source |
|------|-------|--------|--------|
| **Before beta** | COMP-01 through COMP-08 | Cannot give app to anyone outside founder testing | Section 9 roadmap 12.1 / Lock Pack compliance-ledger.md |
| **Before public launch** | COMP-09 (AI cross-border legal opinion), COMP-10 (retention vs delete-all-data resolution) | Cannot launch publicly with AI enabled; cannot commit to retention semantics | Section 9 roadmap 12.2 / Lock Pack constraint-resolution-ledger CR-01, CR-02 |
| **Before Play Store submission** | COMP-05 (Data Safety), COMP-06 (Financial Features declaration) | Cannot submit to Play Store | Section 8 / Section 9 |

### 4.3 Play Store Gates

| Gate | Requirement | Blocks | Source |
|------|-------------|--------|--------|
| **Closed testing** | 12+ opted-in testers, 14 continuous days (if applicable to account type) | Cannot request production access | Section 8, 2.2 |
| **Production review** | Play Store review approval | Cannot distribute via Play Store | Section 8, 2.2 |
| **Neither blocks sideload** | Sideload path is independent | Nothing — sideload can launch regardless | Section 4 M1, Section 8 |

### 4.4 Legal Gates (Open — Cannot Be Resolved by Code)

| Gate | Question | Blocks | Current Status | Source |
|------|----------|--------|----------------|--------|
| **CR-01** | Do AI payload fields (exact amounts, merchant names) constitute SPDI under cross-border transfer rules? | Public AI launch (AI remains buildable and testable but disabled by default) | Open — requires legal opinion | Section 9, 9.4; Lock Pack CR-01 |
| **CR-02** | Does the DPDP Rules 1-year retention floor apply to a local-only app? If so, does it override the locked delete-all-data full-wipe promise? | Public launch delete semantics; may require controlled revision of Section 4 delete-all-data or Section 9 retention approach | Open — requires legal opinion | Section 9, 3.2; Lock Pack CR-02 |

**Rule:** These legal gates cannot be resolved by building code. They require external legal consultation. Code may be built assuming the current locked semantics (AI disabled by default, delete = full wipe), but launch decisions must wait for legal clarity.

---

## 5. PARALLELIZABLE WORK

### 5.1 What Can Run in Parallel

| Work Stream A | Work Stream B | Why Independent |
|---------------|---------------|-----------------|
| M1 (truth engine code) | Pre-path-freeze field tests T1/T2/T11/T12 on minimal Kotlin listener | Field tests need only a bare listener module, not the full truth engine. Section 7 explicitly allows this. |
| Template library expansion (T1b, T1c) | M3 (classification loop) | Template additions are config JSON, not code changes to classification logic |
| Privacy policy drafting (COMP-01) | Any build milestone | Legal writing is independent of code |
| Legal consultation (COMP-09, COMP-10) | Any build milestone | External process, does not block building |
| Play Store developer account setup ($25) | Any build milestone | Account setup takes days for verification; start early |
| Website for sideload distribution | Any build milestone after M1 | Static page, independent of app code |

### 5.2 What Cannot Run in Parallel

| Must Be Sequential | Why |
|--------------------|-----|
| M1 → M2 | Detection must write into a correctly-structured storage layer |
| M2 → M3 | Classification operates on detected transactions |
| M3 → M4 | Identity graph needs classified transactions to discover patterns |
| M4 → M5 | Surfaces must display correct money data, which requires identity/liability logic |
| M5 → M6 | Consent flows attach to existing UI surfaces |
| M6 → beta distribution | Compliance items must clear first |
| Legal opinion → public AI launch | CR-01 gate |
| Legal opinion → retention semantics commitment | CR-02 gate |

---

## 6. FOUNDER RESPONSIBILITIES (CHARAN)

Per Lock Pack roles-and-responsibilities.md, adapted to milestones:

| Responsibility | When | Cannot Delegate |
|----------------|------|-----------------|
| **Approve each locked section** | Before M0 begins | Concept authority is founder-only |
| **Choose milestone priority** | Before each milestone | If circumstances change, founder reorders |
| **Run field tests** | M2 (pre-path-freeze), M6 (pre-beta) | Real payments on real phone with real bank accounts |
| **Test on real device** | Every milestone exit | Pixel 8 is primary test device |
| **Borrow OEM devices** | M2 and beta phases | Samsung/Xiaomi/Realme for OEM coverage |
| **Recruit beta testers** | Before Phase 1 beta | 5-10 for close circle, 12+ for Play Store closed testing |
| **Initiate legal consultation** | Before public launch | COMP-09, COMP-10 are founder decisions |
| **Pay for Play Store account** | Before Play Store submission | $25 one-time |
| **Make launch/no-launch decision** | After M7 + gates clear | Final call is founder-only |
| **Write privacy policy content** | M6 | Legal accuracy is founder's responsibility (Claude can draft, founder approves) |

---

## 7. CODEX RESPONSIBILITIES

Per Lock Pack roles-and-responsibilities.md:

| Responsibility | When | Output |
|----------------|------|--------|
| **Maintain Lock Pack** | Ongoing | All active Lock Pack files current and consistent |
| **Translate concept to guardrails** | Before each milestone | Scoped build brief with lock IDs |
| **Write milestone preflight checklist** | Before each milestone | Completed milestone-preflight-checklist.md |
| **Update coverage ledger** | After each milestone | COV rows marked with status |
| **Update test ledger** | After each milestone | Test items marked pass/fail/blocked |
| **Verify alignment** | After Claude builds | Check code against lock IDs, flag violations |
| **Identify risk** | Ongoing | New risks added to risk-register.md |
| **Track compliance items** | Ongoing | compliance-ledger.md current |
| **Track constraint resolutions** | Ongoing | constraint-resolution-ledger.md current |

---

## 8. CLAUDE RESPONSIBILITIES

Per Lock Pack claude-collaboration-brief.md:

| Responsibility | When | Rules |
|----------------|------|-------|
| **Implement tightly scoped tasks** | During milestones | Only what the build brief specifies |
| **Read locked docs before coding** | Every milestone start | Do not rely on memory; read the files |
| **Restate lock IDs** | Before writing code | State which lock IDs govern this work |
| **State out-of-scope items** | Before writing code | Explicitly list what will NOT be built |
| **Cite lock files** | During implementation | Every design decision traces to a locked section |
| **Stop on ambiguity** | When locked sections don't cover a case | Ask, don't guess |
| **Summarize by lock ID** | After implementation | Which lock IDs were implemented, which gaps remain |
| **Do not add features** | Always | No scope creep, no "improvements" beyond the brief |
| **Do not rely on v1 code** | Always | Legacy code is archived, not reusable without explicit review (legacy-code-disposition.md) |

---

## 9. DEFINITION OF DONE PER MILESTONE

A milestone is NOT done when code exists. A milestone is done when ALL of the following are true:

| Criterion | Verified By |
|-----------|-------------|
| **Code builds** | Both `assemblePlaystoreRelease` and `assembleSideloadRelease` succeed |
| **Code installs** | APK installs and runs on Pixel 8 |
| **Coverage ledger updated** | Relevant COV rows in implementation-coverage-ledger.md marked with status and notes |
| **Test ledger updated** | Relevant test items in test-ledger.md marked pass/fail/blocked with notes |
| **Risk register reviewed** | Any new risks discovered during milestone added to risk-register.md |
| **No lock violations** | Code does not contradict any locked section or frozen logic M1-M10 |
| **No scope creep** | Nothing built that wasn't in the milestone brief |
| **Known gaps documented** | If anything couldn't be completed, written down with reason |
| **Founder tested** | Charan has tested on Pixel 8 and confirmed core behavior |

Source: Lock Pack milestone-build-plan.md ("No milestone is done just because code exists") and milestone-preflight-checklist.md.

---

## 10. LAUNCH-READINESS GATES

### 10.1 Beta Launch (Phase 0: Founder Testing)

| Gate | Status Required |
|------|-----------------|
| M0-M7 all complete | All exit conditions met |
| COMP-01 through COMP-08 cleared | compliance-ledger.md all "Done" except COMP-09, COMP-10 |
| Pre-beta field tests passed | T3, T4 results documented and acceptable |
| AI disabled by default | CR-01 respected |
| Delete = full wipe | Current locked semantics, no hidden retention |
| Release build only | No debug artifacts distributed |

### 10.2 Beta Launch (Phase 1: Close Circle, Phase 2: Wider Beta)

| Gate | Status Required |
|------|-----------------|
| Phase 0 complete | Founder has used app with real money for 2-4 weeks |
| Phase 1 → Phase 2 | Close circle feedback addressed, no critical bugs |
| Play Store closed testing | If applicable: 12+ testers on closed test track, 14-day clock started during Phase 2 |
| Sideload distribution ready | Website with APK, installation instructions, SHA-256 checksum |

### 10.3 Public Launch

| Gate | Status Required |
|------|-----------------|
| Phase 2 beta complete | 4-8 weeks, parser coverage expanded, edge cases addressed |
| COMP-09 resolved | Legal opinion on AI cross-border obtained; AI launch decision made |
| COMP-10 resolved | Legal opinion on retention; delete semantics confirmed or controlled revision completed |
| Play Store approved (if pursuing) | Production review passed, or sideload-only launch decision made |
| Terms of use published | Plain-language, non-exploitative (Section 9 compliance roadmap item #10) |
| Pre-release compliance checklist passed | Lock Pack pre-release-compliance-checklist.md all items checked |

---

## 11. WHAT IS EXPLICITLY NOT ALLOWED BEFORE LAUNCH

| Not Allowed | Why | Source |
|-------------|-----|--------|
| **AI enabled by default** | CR-01 gate: cross-border SPDI question unresolved | Section 9, 9.6; constraint-resolution-ledger CR-01 |
| **Hidden data retention after "Delete all data"** | CR-02 gate: retention vs delete tension unresolved; locked Section 4 says full wipe | Section 9, 3.2; constraint-resolution-ledger CR-02 |
| **Privacy claims stronger than reality** | CPA 2019 prohibits misleading claims; Section 8 locked "By default, your data stays on your device" | Section 9, Section 7; Section 8 privacy listing |
| **READ_SMS in Play Store build** | M1 locked: Play Store = NotificationListenerService only | Section 4 M1; Section 8, 1.1 |
| **Distributing debug builds** | v1 learning: Metro confusion, wrong code running | Section 7 C3; Section 8, 4.2 |
| **Building features beyond v1 scope** | All 17 future ideas parked in future-version-register.md | Lock Pack future-version-register.md |
| **Using v1 legacy code without explicit review** | Risk R-02: legacy code contamination | Lock Pack legacy-code-disposition.md |
| **Skipping the preflight checklist** | Governance is not optional | Lock Pack milestone-preflight-checklist.md |
| **Committing to retention semantics without legal opinion** | Open compliance gate | Section 9; Lock Pack CR-02 |
| **Claiming Play Store approval is guaranteed** | Review is non-public and case-by-case | Section 4 A5; Section 8, 2.2 |

---

## 12. HOW THIS SECTION REINFORCES LOCKED LOGIC

This section creates no new frozen logic. Every milestone, gate, and constraint traces to an existing locked section or Lock Pack file:

| Locked Decision | How Section 10 Respects It |
|-----------------|---------------------------|
| **M1 — Dual distribution** | M1 milestone builds both flavors from day one. No milestone assumes only one channel. |
| **M2 — 6-axis model** | M1 milestone builds the full 6-axis schema first, before any detection or surface code. |
| **M3 — AI optional** | M3 milestone builds AI interface but M6 disables it by default. AI launch gated on CR-01. |
| **M4 — Self-identity graph** | M4 milestone builds graph before M5 surfaces display totals that exclude self-transfers. |
| **M5 — Trust scoring** | M1 milestone builds scoring skeleton; M2 feeds real trust scores; M5 displays them. |
| **M6 — Credit card ledger** | M4 milestone builds ledger with double-count prevention before M5 shows liability on Money tab. |
| **M7 — Cash wallet optional** | M4 includes cash wallet but exit conditions don't require user to use it. |
| **M8 — Reason ontology** | M3 milestone builds ontology structure as part of classification. |
| **M9 — Privacy / local-first** | M6 milestone enforces all compliance items. AI disabled by default. No server built at any milestone. |
| **M10 — Fake defense** | M2 milestone builds notification filter; M3 builds template validation; M7 hardens with full failure phrase list. |
| **Section 5 — Honest UX** | M5 surfaces show confidence badges, estimated labels, quarantine isolation. No false confidence at any milestone. |
| **Section 7 — Field test gating** | 3-tier gating respected: pre-path-freeze in M2, pre-beta in M6, parallel throughout. |
| **Section 8 — Beta phases** | Launch-readiness gates match Section 8's 4-phase beta sequence exactly. |
| **Section 9 — Compliance gates** | COMP-01-08 before beta; COMP-09-10 before public launch. Legal gates cannot be bypassed. |
| **Lock Pack — Governance** | Every milestone follows preflight checklist, updates coverage/test ledgers, respects constitution. |
