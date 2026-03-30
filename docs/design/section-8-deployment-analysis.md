# SECTION 8 — DEPLOYMENT ANALYSIS

> **Status:** LOCKED on 2026-03-28
> **Dependencies:** Sections 1-7 (all locked)
> **Scope:** How SpendSense is built, packaged, distributed, tested, updated, and delivered to users. Covers both distribution channels, build system, field testing execution, beta strategy, update mechanism, and infrastructure requirements — all within the zero-budget, no-backend, local-first constraints.

---

## 1. DISTRIBUTION CHANNELS

### 1.1 Two Channels, One Codebase

Locked in Section 4 (C1, M1): SpendSense ships through two channels from the same React Native codebase, differentiated by a build flavor flag.

| | Play Store | Sideload |
|--|-----------|----------|
| **Build flag** | `DISTRIBUTION=playstore` | `DISTRIBUTION=sideload` |
| **Primary detection** | NotificationListenerService | READ_SMS + BroadcastReceiver |
| **Secondary detection** | Manual entry | NotificationListenerService |
| **Permissions requested** | Notification access (user-granted toggle) | SMS access (runtime) + Notification access |
| **Google Play policy risk** | Medium — market precedent shows automated trackers can exist on Play Store (A5); review is non-public and case-by-case | N/A — not on Play Store |
| **Distribution mechanism** | Google Play Store listing | Website APK download |
| **Update mechanism** | Play Store auto-update | Manual APK download (v1); in-app update check (future) |
| **SMS backfill on install** | No | Yes — reads SMS history for last 30 days |
| **Cold-start experience** | Future-only detection; first transaction appears when next eligible payment happens | 30 days of history immediately on first launch |
| **APK size target** | <25MB (Section 5) | <25MB |

### 1.2 What the Build Flag Controls

```
DISTRIBUTION=playstore:
  - AndroidManifest: NotificationListenerService declared,
    NO READ_SMS / RECEIVE_SMS permissions
  - Onboarding: notification access flow only (Section 5, 4.1)
  - Detection pipeline: C2 (notification-first)
  - SMS-related UI: hidden entirely

DISTRIBUTION=sideload:
  - AndroidManifest: NotificationListenerService + READ_SMS +
    RECEIVE_SMS permissions declared
  - Onboarding: SMS access first, then notification access (Section 5, 4.2)
  - Detection pipeline: C3 (SMS-first with notification secondary)
  - SMS backfill: triggered on first launch after permission grant
```

Everything else is identical: classification, intelligence, identity graph, credit card ledger, cash wallet, budget, UI, export.

### 1.3 Which Channel Ships First

This depends on Play Store review outcome:

```
SCENARIO A: Play Store approves
  → Play Store is primary distribution channel
  → Sideload available on website for users who want SMS access
  → Both maintained in parallel

SCENARIO B: Play Store rejects (initial or after appeal)
  → Sideload launches first
  → Play Store resubmission after addressing feedback
  → Sideload is not a fallback — it is a fully capable channel

SCENARIO C: Play Store rejects permanently
  → Sideload is the only channel
  → Website + direct APK download
  → Architecture already designed for this outcome (Section 7, C4)
```

No scenario kills the product. The dual architecture ensures this.

---

## 2. PLAY STORE DEPLOYMENT

### 2.1 Listing Strategy

```
App name: SpendSense
Category: Finance
Target audience: 18+ (financial data)
Content rating: Everyone (no objectionable content)

Listing focus:
  - "Automatic UPI expense tracking"
  - "No bank login required"
  - "By default, your data stays on your device"
  - Clean, focused — no feature bloat in listing
  - Screenshots showing: home summary, transaction list,
    category breakdown, privacy commitment

Play review / disclosure:
  Play Store submission may require app-content declarations,
  privacy disclosures, or review questionnaires depending on
  Play Console requirements at the time of submission. The exact
  mechanism is not frozen here.

  If a declaration or questionnaire is required, answer honestly
  using the locked privacy and permission model:
    - Why notification access: core function — detects bank and
      UPI payment notifications for automated expense tracking
    - Data handling: stored locally by default, no SpendSense server,
      optional AI sends only limited masked fields if user enables it
    - Alternatives: manual entry available as fallback
    - Precedent: FinArt (10K+ installs) uses similar automation
      and is live on Play Store
```

### 2.2 Play Store Distribution Constraints

- Play Store review is non-public and case-by-case (Section 4, A5)
- Outcome is not knowable in advance
- Market precedent (FinArt, 10K+ installs) shows automated expense trackers can exist on Play Store
- FinArt proves the category is viable, not that SpendSense specifically will be approved
- First submission should be minimal — core tracking features only, no experimental additions
- If rejected: read rejection reason carefully, address specific feedback, resubmit

**Closed testing requirement (current as of early 2026):**

For newly created personal developer accounts, Google currently requires a closed test track with at least 12 opted-in testers running the app for a minimum of 14 continuous days before production access can be requested. This may not apply to all account types (organization accounts, accounts with prior app history), and the policy may change.

If this constraint applies:
- Phase 2 beta (wider beta) must be structured as a Play Store closed test
- Need 12+ testers opted in via Play Console, running the Play Store build
- 14-day clock starts when the first tester installs from the closed test track
- During this period: sideload version is already available for broader distribution
- After 14 days: request production access, submit for full review
- This adds ~2-3 weeks between "ready to submit" and "available on Play Store"

This constraint does not affect sideload distribution at all.

### 2.3 Play Store Update Cycle

```
Updates delivered via Play Store auto-update:
  - Template library updates (new bank notification formats)
  - Package whitelist additions (new banking apps)
  - Bug fixes and parser improvements
  - Feature additions within approved permission scope

What CANNOT change via update:
  - Adding new permissions (requires new review)
  - Changing core permission justification
```

---

## 3. SIDELOAD DEPLOYMENT

### 3.1 Distribution Mechanism

```
Phase 1 (launch):
  - Website page with:
    - APK download link
    - Clear installation instructions with screenshots:
      1. Download the APK
      2. Open the file
      3. If prompted "Install from unknown sources": tap Settings,
         enable for your browser, return
      4. Install
      5. Open SpendSense
    - Why sideload? "This version can read bank SMS for more
      accurate tracking. Google Play restricts SMS access for
      most apps."
    - SHA-256 checksum for APK verification
    - Version number and changelog

Phase 2 (when viable):
  - In-app update check: on app open, fetch version.json from website
  - If newer version available: "Update available. Download now?"
  - User downloads and installs manually
  - No auto-install (Android restriction for non-Play apps)
```

### 3.2 Sideload Trust Concerns

Users installing APKs from websites face trust friction. Mitigations:

```
1. HTTPS-only download page
2. SHA-256 checksum published alongside APK
3. Clear explanation of why sideload exists:
   "Google Play restricts SMS access for most apps. This version
    reads bank SMS for more accurate, faster transaction detection."
4. Same app, same privacy model — the only difference is SMS access
5. Open-source consideration (future): publishing source code would
   eliminate trust concerns for technical users
```

### 3.3 Sideload Update Discipline

Without Play Store auto-update, sideload users must update manually. This means:

- Template library updates are slower to reach sideload users
- Must prioritize shipping comprehensive initial templates
- Version.json check (Phase 2) helps notify users of updates
- Critical fixes require user action to install — cannot force-update

---

## 4. BUILD SYSTEM

### 4.1 Build Configuration

```
PROJECT STRUCTURE:
  /android
    /app
      build.gradle → productFlavors { playstore, sideload }
      /src
        /main          → shared code (all classification, UI, storage)
        /playstore     → Play Store AndroidManifest overlay
        /sideload      → Sideload AndroidManifest overlay + SMS modules

  /src (React Native JS)
    → All shared. Detection source selected at runtime based on
      native module availability.

BUILD COMMANDS:
  Play Store release:
    cd android && ./gradlew assemblePlaystoreRelease
  Sideload release:
    cd android && ./gradlew assembleSideloadRelease
  Both:
    cd android && ./gradlew assembleRelease

OUTPUT:
  app-playstore-release.apk
  app-sideload-release.apk
```

### 4.2 Signing

```
RELEASE SIGNING:
  - Single keystore for both flavors
  - Keystore stored securely offline (not in repo, not in cloud)
  - Backup of keystore is critical — losing it means inability to
    update Play Store listing
  - Play Store: enrolled in Google Play App Signing
    (Google holds upload key derivative)
  - Sideload: signed with same release key for consistency

DEBUG BUILDS:
  - Debug keystore (default Android debug key)
  - NEVER distribute debug builds to testers (v1 learning:
    Metro confusion, wrong code running)
  - All testing uses release builds
```

### 4.3 Versioning

```
VERSION SCHEME:
  versionCode: integer, increments with every release (both channels)
  versionName: semantic versioning (1.0.0, 1.0.1, 1.1.0, etc.)

RULES:
  - Both flavors share the same versionCode and versionName per release
  - Play Store and sideload APKs from the same release are functionally
    identical except for permission scope
  - versionCode never reused or decremented
```

---

## 5. FIELD TESTING EXECUTION PLAN

### 5.1 Testing Tiers (from Section 7)

| Tier | Tests | When | Requires |
|------|-------|------|----------|
| **Pre-path-freeze** | T1, T2, T11, T12 | Before freezing detection implementation path | Working notification listener (basic Kotlin module) |
| **Pre-beta** | T3, T4 | Before external beta release | Working SMS parser (T3), working onboarding flow (T4) |
| **Parallel** | T1b, T1c, T5-T10, T13, T14 | During implementation, in parallel | Varies — most need basic working app |

### 5.2 Pre-Path-Freeze Tests (earliest priority)

These determine architectural decisions. Can run on a minimal Kotlin test harness before full app is built.

```
T1: GPay Notification Parsing
  Method: Build minimal NotificationListenerService module.
    Make real payments via GPay across SBI, HDFC, ICICI, Kotak, Axis.
    Log raw notification text. Test across Samsung, Xiaomi, Realme.
  Target: 50+ notifications across 5 banks x 3 OEMs
  Decision it informs: Play Store detection coverage.
    If merchant missing → "Unknown merchant" fallback.

T2: Listener Battery Survival
  Method: Install listener module. Leave phone idle 72 hours.
    No user interaction. Check if listener is still alive.
    Test on Samsung, Xiaomi, Realme.
  Decision it informs: Is foreground service needed?
    Determines C1 mitigation layers.

T11: Foreground Service Necessity
  Method: Same as T2 but with/without foreground service.
    Compare survival rates per OEM.
  Decision it informs: Whether persistent notification is needed
    and on which OEMs.

T12: Listener Rebind After Kill
  Method: Force-stop app, reboot device, trigger battery kill.
    Check if listener rebinds automatically.
    Test across OEMs.
  Decision it informs: Whether watchdog mechanism is needed.
```

### 5.3 Pre-Beta Tests

These require early implementation slices to be testable.

```
T3: Bank SMS Format Stability
  Method: Collect 200+ real bank SMS across SBI, HDFC, ICICI, Kotak, Axis.
    Run through parser. Measure extraction success rate.
  Requires: Working SMS parser (Layer A rule engine).
  Decision it informs: Sideload detection reliability.

T4: Permission Grant Rate
  Method: Give working app with onboarding flow to 20 beta users.
    Measure: how many grant notification access?
  Requires: Working onboarding flow.
  Decision it informs: If <60% → redesign onboarding copy.
```

### 5.4 Test Devices

Charan's primary test device:
- Android 16 (latest)
- Uses Paytm, GPay
- Has HDFC, SBI accounts

Additional devices needed for OEM coverage:
- Samsung (any Galaxy A-series or M-series — dominant in India)
- Xiaomi/Redmi (dominant budget segment)
- Realme (aggressive battery optimization)

Minimum: 3 devices across 3 OEMs. Ideal: 5 devices across 5 OEMs.

Zero-budget approach: borrow devices from friends/family for 72-hour soak tests. Return after testing. No purchase required for field testing.

---

## 6. BETA STRATEGY

### 6.1 Beta Phases

```
PHASE 0: FOUNDER TESTING (Charan only)
  Duration: 2-4 weeks
  Device: Primary phone (Android 16)
  Scope: All features, both flavors
  Goal: Catch obvious bugs, verify detection works with real payments
  Data: Real transactions from daily use
  Distribution: local release APK install

PHASE 1: CLOSE CIRCLE (5-10 people)
  Duration: 2-4 weeks
  Who: Friends, family, trusted contacts
  Scope: Core features — detection, classification, dashboard
  Goal: Verify across OEMs, banks, UPI apps
    Run T4 (permission grant rate) during this phase
  Distribution: Sideload APK via direct share
  Feedback: Direct conversation — no formal feedback tool needed

PHASE 2: WIDER BETA (20-50 people)
  Duration: 4-8 weeks
  Who: Phase 1 circle + extended network
  Scope: Full feature set including budget, credit card, cash wallet
  Goal: Stress-test parser, dedup, pattern learning
    Collect notification/SMS samples for template library expansion
    Run remaining parallel field tests (T1b, T1c, T5-T10, T13, T14)
  Distribution: Sideload APK from website
    + Play Store closed test track (if Play Store closed testing
      requirement applies — need 12+ opted-in testers for 14+
      continuous days before production access can be requested)
  Feedback: Simple form or structured conversation

  If closed testing requirement applies:
    Phase 2 doubles as the mandatory Play Store closed test period.
    Ensure 12+ testers install from Play Console closed test track
    (not just sideload). 14-day clock runs in parallel with wider beta.

PHASE 3: PUBLIC LAUNCH
  Distribution: Play Store (if approved) + Sideload website
  Play Store: staged rollout for updates available via Play Console
  Sideload: no staged rollout control
  Monitor: manually check in with early users
```

### 6.2 Beta Feedback Collection

Zero-budget, no backend. Feedback mechanisms:

```
In-app:
  - Settings → "Send feedback" → opens email compose with
    pre-filled subject line and device info
  - No self-hosted analytics SDK or crash reporting service
  - Play Store builds: Play Console provides Android vitals,
    crash clusters, and ANR data automatically
  - Sideload builds: if a crash occurs, Android system crash log
    available to user to share manually

External:
  - WhatsApp group or Telegram channel for beta testers
  - Direct conversations with Phase 1 testers
  - Google Form for Phase 2 structured feedback

What to collect:
  - OEM + Android version
  - Banks used
  - UPI apps used
  - Transactions detected vs missed (user's count vs app's count)
  - Wrong classifications
  - Permission issues
  - Battery/listener problems
```

---

## 7. UPDATE AND MAINTENANCE

### 7.1 What Needs Regular Updates

| Component | Update Frequency | How Shipped |
|-----------|-----------------|-------------|
| **Template library** (bank notification regex) | As needed when banks change formats | App update (both channels) |
| **Package whitelist** (bank/UPI app package names) | Quarterly or when new apps appear | App update |
| **Known merchant database** (200+ hardcoded merchants) | Quarterly | App update |
| **Bill payee patterns** (credit card bill payee names) | As discovered | App update |
| **Bank SMS shortcode database** (sideload) | As discovered | App update |
| **OEM battery instructions** | As OEMs change settings UI | App update |
| **Failure phrase list** | As new bank phrases discovered | App update |

All of these are updatable configuration stored as JSON, not compiled constants (Section 4). But they still require an app release to reach users.

### 7.2 What Does NOT Need Updates

- Classification logic (rule engine code) — stable once built
- UI/UX — stable after launch
- 6-axis model — frozen (M2)
- Privacy model — frozen (M9)
- Intelligence tier architecture — frozen (M3)

### 7.3 Update Strategy Per Channel

```
PLAY STORE:
  - Submit update to Play Store
  - Auto-update reaches users within days
  - No user action required
  - Fastest path for critical template fixes

SIDELOAD:
  - Publish new APK on website
  - Phase 1: users must check website manually
  - Phase 2: in-app version check notifies user
  - User must download and install manually
  - Slower update adoption — prioritize comprehensive initial templates
```

---

## 8. INFRASTRUCTURE REQUIREMENTS

### 8.1 What SpendSense Needs (v1)

```
REQUIRED:
  - Development machine (Charan's existing setup)
  - Android device(s) for testing
  - Google Play Developer account ($25 one-time fee)
  - Website for sideload distribution (static page, free hosting)
  - Release keystore (generated locally, backed up securely)

OPTIONAL:
  - Domain name for sideload website (~$10/year)
  - Additional test devices (borrow, not buy)

NOT NEEDED:
  - Server / backend / VPS / cloud instance
  - Database service
  - Analytics service
  - Crash reporting service
  - CI/CD pipeline (manual builds are fine at this scale)
  - Push notification service (uses Android local notifications)
  - CDN
  - API server
```

### 8.2 What Costs Money

| Item | Cost | Required? |
|------|------|-----------|
| Google Play Developer account | $25 one-time | Yes (for Play Store channel) |
| Domain name | ~$10/year | No (can use free hosting subdomain) |
| Everything else | $0 | — |

Total launch cost: $25 (Play Store) to $35 (Play Store + domain).

The zero-budget constraint is real and the architecture is designed for it. No server means no server cost. No analytics means no analytics cost. User-provided AI keys means no AI cost to the developer.

### 8.3 User Cost During Beta / v1

- Beta access: Free
- AI (optional): User provides own Gemini API key (Gemini Flash free tier) — current model during beta/v1
- Storage: On their device (no cloud storage fee)
- Public pricing and monetization: deferred to Section 11 (Profit Model and Target Numbers)

---

## 9. SECURITY CONSIDERATIONS

### 9.1 APK Security

```
RELEASE BUILD ONLY:
  - Debug builds never distributed (v1 learning)
  - ProGuard/R8 code shrinking and obfuscation enabled
  - Release APK signed with release keystore

SIDELOAD INTEGRITY:
  - SHA-256 checksum published alongside APK
  - Users can verify downloaded APK matches published checksum
  - HTTPS-only download page
```

### 9.2 Data Security (On-Device)

```
STORAGE:
  - SQLite database stored in app's private directory
  - Android sandboxing prevents other apps from reading it
  - Not accessible without root access
  - Encrypted storage consideration: Android Keystore for
    sensitive fields (API keys) — implementation decision,
    not frozen logic

DELETION:
  - "Delete all data" in Settings → complete wipe (Section 4, 14)
  - App uninstall removes all data (Android default behavior
    for app-private storage)

EXPORT:
  - CSV file saved to shared storage (user's Downloads)
  - User is responsible for exported file security
  - Export file is not encrypted (plain CSV)
```

### 9.3 AI Key Security

```
- User's API key stored locally in app-private storage
- Key never sent to any server (no SpendSense server exists)
- Key used only for direct API calls to user's chosen provider
- If phone is compromised (rooted), key could be extracted —
  same risk as any app storing credentials locally
- Mitigation: Android Keystore for encrypted key storage
  (implementation decision)
```

---

## 10. ROLLOUT DECISION TREE

```
START
  │
  ├─ Build core detection module (Kotlin NotificationListenerService)
  │
  ├─ Run pre-path-freeze tests (T1, T2, T11, T12)
  │    Results determine:
  │    ├─ Foreground service needed? → per-OEM decision
  │    ├─ Watchdog needed? → rebind strategy
  │    └─ Notification format viable? → parser template approach
  │
  ├─ Build full app (classification, UI, all systems)
  │    Run pre-beta tests (T3, T4) using early builds
  │
  ├─ Phase 0: Founder testing (2-4 weeks)
  │
  ├─ Phase 1: Close circle beta (5-10 people, 2-4 weeks)
  │    Collect: OEM coverage, detection accuracy, permission grant rate
  │
  ├─ Phase 2: Wider beta (20-50 people, 4-8 weeks)
  │    Collect: parser coverage, pattern learning quality, edge cases
  │    Run parallel field tests (T1b, T1c, T5-T10, T13, T14)
  │    If Play Store closed testing applies:
  │      run closed test track in parallel (12+ testers, 14+ days)
  │
  ├─ DECISION: Submit to Play Store production?
  │    ├─ Yes → submit for production review
  │    │    (complete any required review disclosures using locked
  │    │     privacy/permission model)
  │    │    ├─ Approved → launch both channels
  │    │    └─ Rejected → launch sideload, appeal/resubmit Play Store
  │    └─ No (skipping Play Store for now) → launch sideload only
  │
  └─ PUBLIC LAUNCH
       Play Store (if approved) + Sideload website
```

---

## 11. HONEST CONSTRAINTS

Things this deployment plan cannot do:

| Constraint | Why | Impact |
|-----------|-----|--------|
| Cannot force-update sideload users | No Play Store auto-update for sideload | Template fixes reach sideload users slowly |
| Cannot guarantee Play Store approval | Review is non-public, case-by-case | May launch sideload-first |
| No self-hosted crash reporting | No backend, no analytics SDK in v1 | Sideload: rely on user-reported feedback. Play Store: Play Console provides Android vitals, crash clusters, and ANR data for Play-distributed builds — partial but useful visibility. |
| Cannot A/B test at scale | Zero-budget, no infrastructure | Beta testing is manual and small-sample |
| Cannot do staged rollout for sideload | No backend to control sideload rollout | Sideload launch is all-or-nothing. Play Store updates can use staged rollout via Play Console. |
| Cannot revoke a sideload APK | Once downloaded, user has it | Must be confident before publishing sideload |
| Cannot track install counts for sideload | No analytics | Only know sideload adoption from feedback |

These are accepted constraints, not problems to solve. The architecture is designed to work within them.

---

## 12. LOCKED DECISIONS THIS SECTION REINFORCES

- **M1**: One codebase, build flavor flag. Play Store = notification only. Sideload = SMS primary.
- **M9**: No server, no cloud, no analytics. All data local. This shapes every deployment decision.
- **Section 5 performance**: <25MB APK, <500ms home render.
- **Section 7 field-test gating**: Pre-path-freeze / pre-beta / parallel tiers respected in rollout sequence.
- **v1 learnings**: Release builds only, custom Kotlin native modules, SQLite not AsyncStorage, no migration flag patterns.
