# SECTION 9 — GOVERNMENT REGULATIONS

> **Status:** LOCKED on 2026-03-29
> **Dependencies:** Sections 1-8 (all locked)
> **Scope:** Every regulation, law, and policy that applies to SpendSense — what it requires, whether SpendSense complies, what must be built, and what must be monitored. Separates confirmed legal obligations from high-confidence inferences from uncertainties requiring legal consultation.

---

## 1. REGULATORY POSITION SUMMARY

SpendSense is a **local-first, read-only expense tracker**. It does not process payments, hold money, lend, borrow, or act as a financial intermediary. This means:

- **No RBI license required** — not a Payment Aggregator, NBFC, or Account Aggregator
- **No NPCI/TPAP registration required** — does not participate in UPI infrastructure
- **No SEBI/IRDAI registration required** — does not advise on investments or insurance
- **Subject to data protection law** — reads and processes personal financial data (SPDI)
- **Subject to consumer protection law** — distributes a digital product to Indian consumers
- **Subject to Google Play policies** — for Play Store distribution channel

This section documents every applicable regulation, what it demands, and how SpendSense meets or plans to meet each requirement.

---

## 2. CURRENT LAW: IT ACT 2000 + SPDI RULES 2011

### 2.1 Why This Applies Now

The Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 — issued under Section 43A of the IT Act — are the **governing law today** for apps handling sensitive personal data. They remain in force until the DPDPA's substantive provisions take effect (May 2027).

SpendSense reads, parses, and stores transaction data including amounts, merchant names, payment instruments, and account identifiers. This is **financial information** — explicitly listed as Sensitive Personal Data or Information (SPDI) under Rule 3.

### 2.2 Obligations and Compliance

| SPDI Rule | Requirement | SpendSense Compliance |
|-----------|-------------|----------------------|
| **Rule 4 — Privacy policy** | Must publish a privacy policy disclosing: what data is collected, purpose, recipients, security practices, user rights | **Must build.** Privacy policy required at launch — displayed in-app and on Play Store listing. |
| **Rule 5(1) — Consent** | SPDI collection requires prior informed consent | **Already designed.** Section 5 locked: explicit permission flows for notification access (Play Store) and SMS access (sideload). Consent is opt-in, never pre-checked. |
| **Rule 5(3) — Purpose limitation** | Data collected only for lawful purposes connected to the app's function | **Compliant by design.** SpendSense only reads transaction-related data. Non-financial content is discarded; raw text of confirmed financial transactions may be stored locally for re-parsing/provenance but is never sent to AI (Section 4, M9). |
| **Rule 5(5) — Right to review** | Users can review and correct their data | **Must build.** Transaction list is already user-editable (Section 5). Add explicit "view all data collected" option in Settings. |
| **Rule 5(6) — Right to withdraw** | Users can withdraw consent; app must stop processing | **Must build.** Revoking notification/SMS access stops detection. Add in-app "delete all data" action. |
| **Rule 5(7) — Retention** | Data kept only as long as purpose requires, or as required by law | **Must define.** Data is local-only, user controls deletion. Document retention policy in privacy policy. |
| **Rule 7 — Cross-border transfer** | SPDI transferred outside India requires equivalent protection at the receiving end | **Applies to AI pathway only.** When user enables optional AI classification, per-use-case payload fields (which include exact amounts and merchant names for some use cases — see Section 9.2) are sent to Gemini API (Google servers, potentially outside India). Whether these fields constitute SPDI is an open legal question. |
| **Rule 8 — Reasonable security** | Must implement reasonable security practices (ISO 27001 or equivalent) | **Must implement.** Local SQLite with encryption. No network transmission of raw data. Security measures documented below. |

### 2.3 SpendSense Is Not an Intermediary

Section 2(1)(w) of the IT Act defines an "intermediary" as an entity that receives, stores, or transmits electronic records **on behalf of another person**. SpendSense processes the user's own data for the user's own benefit. No third-party content flows through it. Safe harbour under Section 79 is irrelevant — SpendSense is not an intermediary.

---

## 3. UPCOMING LAW: DIGITAL PERSONAL DATA PROTECTION ACT (DPDPA) 2023

### 3.1 Enforcement Timeline

The DPDP Rules 2025 were notified on November 13, 2025. Enforcement is phased:

| Phase | Date | What Takes Effect |
|-------|------|-------------------|
| **Phase 1** | November 2025 (in effect) | Data Protection Board of India (DPBI) established; definitions operational |
| **Phase 2** | November 2026 | Consent manager registration and obligations |
| **Phase 3** | May 2027 | Full substantive enforcement — consent, security safeguards, breach notification, data principal rights, cross-border transfer restrictions |

**SpendSense must be DPDPA-compliant by May 2027.** Given that beta launch may happen before this date, building toward compliance from day one is the correct approach.

### 3.2 SpendSense as Data Fiduciary

Under DPDPA, SpendSense is a **data fiduciary** — it determines the purpose and means of processing personal data. Key obligations:

| DPDPA Obligation | Requirement | SpendSense Approach |
|------------------|-------------|---------------------|
| **Consent** | Clear, standalone notice: what data is collected, purpose, how to withdraw. Freely given, specific, informed, unambiguous. | Section 5 already designs explicit consent flows. Enhance with DPDPA-compliant notice language. |
| **Purpose limitation** | Process data only for the stated purpose | Architecture enforces this — detection pipeline only reads transaction-relevant data (Section 4, M9) |
| **Data minimization** | Collect only what is necessary | Non-financial notification content is discarded. For confirmed financial transactions, raw notification/SMS text may be stored locally for re-parsing and provenance (locked Sections 4 and 7). Raw text is never sent to AI (Section 4, M9). |
| **Security safeguards** | Encryption, access controls, access logging, data backups | Local SQLite encryption, no network storage, OS-level app sandboxing. Backup = user-initiated export (Section 4). |
| **Breach notification** | Notify DPBI and affected users if personal data breach occurs | Low risk for local-only app (no server to breach). Build notification capability for completeness. |
| **Data principal rights** | Right to access, correct, erase data; right to nominate representative | Transaction editing already designed. Add formal "access all data" and "erase all data" flows. |
| **Retention limits** | DPDP Rules require retention of personal data for at least 1 year, even after account deletion | **Compliance/design tension.** Locked Section 4 promises "Delete all data" returns the app to fresh-install state with ALL data permanently deleted (transactions, learned memory, identity graph, everything). A 1-year retention floor could conflict with this promise. This tension is not yet resolved — it requires legal clarification on whether a local-only app with no server and no account system is subject to the same retention floor as apps with backend infrastructure. Until resolved: do NOT silently override the locked delete-all-data semantics, and do NOT commit to 1-year retention as settled implementation. Track as an open compliance question. |
| **Cross-border transfer** | Permitted unless Central Government restricts a country (negative list approach). No countries restricted as of March 2026. | Gemini API calls go to Google servers (potentially US-based). Currently permitted. Monitor negative list. |

### 3.3 Significant Data Fiduciary (SDF) Classification

The DPDPA allows the Central Government to designate entities as Significant Data Fiduciaries based on volume, sensitivity of data, risk to data principals, etc. SDF obligations include:
- Appointing a Data Protection Officer (India-based)
- Independent data audits
- Data Protection Impact Assessments

**SpendSense is unlikely to be classified as SDF** given its scale (single-developer, early-stage, local-only). No SDF designation criteria for personal-finance apps have been announced. Monitor for changes.

---

## 4. RBI REGULATIONS

### 4.1 What SpendSense Is NOT

| Regulated Entity | Why SpendSense Is NOT This |
|------------------|---------------------------|
| **Payment Aggregator** | Does not facilitate, process, or settle payments. Minimum capital: ₹15-25 crore. |
| **NBFC** | Does not lend, borrow, or handle financial instruments. |
| **Account Aggregator (NBFC-AA)** | Does not pull data from banks via AA framework APIs. Reads device-level notifications/SMS only. Minimum: ₹2 crore net owned funds + RBI license. |
| **Payment System Operator** | Does not operate a payment system under PSS Act 2007. |

### 4.2 RBI Data Localization (April 2018 Circular)

RBI mandates that all authorized Payment System Operators store full end-to-end payment transaction data **only in India**. This applies to entities authorized under the Payment and Settlement Systems Act 2007.

**SpendSense is not a PSO.** The data localization circular does not directly apply. However:
- All transaction data is stored locally on the user's device (India by definition)
- The only cross-border pathway is the optional AI classification via Gemini API, which sends defined per-use-case payload fields (see Section 9.2) — not raw notification text, not full payment system data

### 4.3 Regulatory Boundary

SpendSense sits outside the RBI regulatory perimeter because it:
1. Does not touch money
2. Does not connect to bank APIs
3. Does not act as an intermediary between the user and any financial institution
4. Does not provide financial advice, lending, or credit assessment

**If SpendSense ever adds features that pull data from bank APIs, facilitate payments, or provide investment recommendations, the regulatory position changes fundamentally.** This boundary must be respected in all future feature decisions.

---

## 5. NPCI / UPI REGULATIONS

### 5.1 SpendSense Is Not a TPAP

NPCI governs Third Party Application Providers (TPAPs) that participate in UPI through a Payment Service Provider. TPAPs must:
- Store all UPI transaction data in India
- Obtain explicit customer consent before using transaction data for value-added services
- Comply with volume caps (30% cap per TPAP, extended to December 2026)

**SpendSense does not participate in UPI infrastructure.** It does not initiate, process, or facilitate UPI transactions. It reads notifications that UPI apps generate on the user's device. NPCI's TPAP-specific rules do not apply.

### 5.2 Regulatory Gray Area

No NPCI regulation explicitly addresses apps that parse UPI transaction data from device notifications/SMS for non-payment purposes. This is a gray area:

- **In SpendSense's favor:** The data source is the user's own device, not the UPI network. The user explicitly grants permission. SpendSense never connects to NPCI infrastructure.
- **Risk:** If NPCI considers notification-parsed UPI data as "UPI transaction data," they could theoretically require compliance with data handling norms. This seems unlikely given the architecture but is not impossible.
- **Evidence tier:** High-confidence inference that NPCI rules do not apply. Not confirmed by explicit NPCI guidance.
- **Mitigation:** Monitor NPCI circulars. If new guidance emerges, assess impact immediately.

---

## 6. TRAI / TELECOM REGULATIONS

### 6.1 DND and UCC Regulations

TRAI's Telecom Commercial Communications Customer Preference Regulations (TCCCPR 2018, amended February 2025) regulate **senders** of unsolicited commercial communications, not recipients' choice of apps.

- TRAI regulates telemarketers, businesses, and their DLT-registered message templates
- TRAI does **not** regulate which apps a user chooses to grant SMS read permission to
- The user granting READ_SMS to SpendSense (sideload) is an Android OS-level permission, not a TRAI-regulated act

### 6.2 SpendSense Compliance

No TRAI-specific compliance obligations apply. SpendSense:
- Does not send any SMS or communications
- Does not act as a telemarketer or commercial sender
- Reads the user's own transactional SMS (sideload only) with explicit permission

---

## 7. CONSUMER PROTECTION ACT 2019

### 7.1 Applicable Obligations

SpendSense is a digital product distributed to Indian consumers. The CPA 2019 applies:

| Obligation | Requirement | SpendSense Approach |
|------------|-------------|---------------------|
| **No misleading claims** | App description, privacy claims, and marketing must be truthful | Section 8 locked: privacy listing says "By default, your data stays on your device." If AI is enabled, disclosure is explicit. |
| **No unfair trade practices** | Must not fail to disclose material information about data handling | Full disclosure in privacy policy, Play Store listing, and in-app consent flows. |
| **Unfair contracts** | Terms must not be unilateral or unreasonable | Terms of use must be plain-language, not exploitative. No binding arbitration clauses. |
| **CCPA jurisdiction** | Central Consumer Protection Authority can investigate violations, impose penalties up to ₹10 lakh (₹50 lakh repeat) | Ensure all claims are evidence-backed. No exaggeration of AI capabilities or data isolation. |

### 7.2 Specific Risk: AI Feature Claims

If SpendSense claims "AI-powered categorization" but the AI feature sends data to an external API (Gemini), this must be clearly disclosed. Failing to disclose constitutes a **misleading omission** — an unfair trade practice under the CPA. The locked design already handles this:
- Section 4, M3: AI is optional, app fully functional without it
- Section 4, M9: per-use-case AI payload definitions, raw notification text never sent
- Section 5: AI is presented as opt-in with explicit disclosure of what data leaves the device

---

## 8. GOOGLE PLAY POLICIES (REGULATORY DIMENSION)

### 8.1 Cross-Reference with Section 8

Section 8 covers Play Store deployment strategy, listing, review process, and approval scenarios. This section covers the **regulatory and policy compliance** dimension.

### 8.2 Applicable Policies

| Policy | Requirement | SpendSense Status |
|--------|-------------|-------------------|
| **SMS/Call Log permissions** | READ_SMS restricted to default SMS/Phone/Assistant handlers. Temporary exception path exists via Permissions Declaration Form. | Play Store build does NOT request READ_SMS (Section 4, M1). Sideload only. |
| **NotificationListenerService** | Classified as sensitive permission. | Play Store review required. Market precedent shows automated expense trackers can exist on Play Store (A5, FinArt). Review is non-public and case-by-case — outcome is not knowable in advance (Section 4, Section 8). |
| **Data Safety section** | Mandatory disclosure: all data collected, shared, purposes, security practices | Must complete accurately: notification data read, transaction data parsed/stored locally, optional Gemini API transfer. |
| **Financial Features declaration** | Required for any app with financial features, per current Google Play policy | Must complete in Play Console before submission. |
| **Play Protect (sideload)** | Sideloaded apps requesting sensitive permissions trigger Play Protect warnings | Users must manually override. Sideload onboarding must include clear guidance (Section 8, 3.3). |
| **Privacy policy** | Required for all apps accessing sensitive permissions or personal data | Privacy policy must be published and linked in Play Store listing and in-app. |

### 8.3 What Must Be Built for Play Store Compliance

1. **Privacy policy** — accessible in-app and via URL linked in Play Store listing
2. **Data Safety section responses** — prepared before first submission
3. **Financial Features declaration** — completed in Play Console
4. **Permission justification** — clear explanation of why NotificationListenerService is needed, ready for review
5. **Honest disclosure** — if any data leaves the device (AI pathway), declared in Data Safety and privacy policy

---

## 9. CROSS-BORDER DATA TRANSFER ANALYSIS

### 9.1 When Data Leaves the Device

SpendSense is local-first (Section 4, M9). The **only** pathway where data leaves the device is:

**Optional AI classification via Gemini API** — when the user explicitly enables AI and provides their own API key.

### 9.2 What Is Sent

Per Section 4 (F5, M9), the AI payload is defined per use case with an explicit whitelist of fields sent and a blacklist of fields never sent. Raw notification text is **never** sent. The exact locked payloads are:

| Use Case | Fields Sent (locked Section 4, F5) | Fields Never Sent |
|----------|-------------------------------------|-------------------|
| **Transaction classification** | Exact amount, currency (INR), merchant name, VPA local part only (e.g. "zomato" — never full VPA with handle), flow (inflow/outflow), instrument type, day_of_week + time_bucket (never exact timestamp), user history summary if pattern exists (never raw transaction history) | Raw notification text, account numbers or hints, full VPA handles, phone numbers, UPI reference numbers, bank names, balance information, user's name or identity |
| **Purpose inference** | Same fields as transaction classification, plus category already assigned (if any), plus amount_relative (typical / higher_than_usual / lower_than_usual) | Same exclusions as transaction classification |
| **Insight generation** | Aggregated category totals for period, category deltas vs previous period, number of transactions per category, budget utilization percentage if set | Individual transaction details, merchant names, any raw notification text, account/identity information, specific amounts of individual transactions |
| **Anomaly explanation** | Anomaly description (e.g. "spending in [category] is [X]x usual"), category average for past 3 cycles, current cycle total, number of transactions in anomaly period | Individual transactions, merchant names, any raw data |

**Note:** Transaction classification sends exact amounts and merchant names — not masked ranges. This is the locked architecture (Section 4, F5). If a future legal opinion on SPDI cross-border transfer recommends stricter masking (e.g., amount ranges instead of exact amounts, anonymized merchant names), that would be a controlled architectural change requiring explicit revision of M9 — not something Section 9 can impose unilaterally.

### 9.3 Regulatory Analysis of AI Pathway

| Regulation | Applicability | Assessment |
|------------|---------------|------------|
| **SPDI Rules 2011, Rule 7** | Cross-border SPDI transfer requires equivalent protection at receiving end | Google's data protection practices are documented. Whether the AI payload fields (which include exact amounts and merchant names for some use cases) constitute SPDI depends on whether they can identify an individual — **requires legal opinion.** |
| **DPDPA cross-border transfer** | Negative list approach — permitted unless a country is restricted | No countries restricted as of March 2026. US (likely Gemini server location) is not restricted. Monitor negative list updates. |
| **RBI data localization** | Applies to Payment System Operators only | SpendSense is not a PSO. Does not apply. |
| **Google Play Data Safety** | Must declare all data sent off-device | AI pathway must be declared in Data Safety section. |

### 9.4 Key Uncertainty

**Whether the AI payload fields constitute "personal data" or "SPDI" under Indian law is an open question.** The locked payload (Section 4, F5) includes exact amounts and merchant names for transaction classification — these are not fully anonymized. Account numbers, full VPAs, bank names, and user identity are excluded, but the combination of merchant name + exact amount + time context may be sufficient to identify a transaction and therefore a person. This needs a legal opinion before launch. If the opinion concludes the payload constitutes SPDI, either the cross-border transfer must be justified under Rule 7 / DPDPA negative list, or the payload must be hardened (a controlled M9 revision).

### 9.5 Mitigation

Regardless of the legal opinion:
- AI is optional — app fully functional without it (Section 4, M3)
- Raw notification text is never sent (Section 4, M9)
- In-app disclosure is explicit about what leaves the device

**Architectural fact (not a legal mitigation):** The user provides their own Gemini API key, and the API call is initiated from the user's device using their own Google account relationship. Whether this shifts any data fiduciary responsibility away from SpendSense is an open legal question (listed in Section 13 as an uncertainty). Do not treat this as a settled defense.

### 9.6 Safest Launch Posture

Because AI is optional (locked M3), the **legally safest beta and public-launch posture is to ship with AI disabled by default** until the cross-border / SPDI legal interpretation is resolved. This means:

- Beta launches with rules + pattern memory only — no AI calls
- AI can be enabled later via a settings toggle once the legal opinion is obtained and any necessary payload hardening is complete
- The core app is fully viable without AI (every use case has a non-AI fallback — locked Section 4, F5)
- This is a **risk-reduction option, not a product failure** — the intelligence pipeline, purpose capture, insights, and anomaly detection all function without AI

This does not prevent building the AI integration during development. It only means the user-facing toggle stays off by default until the regulatory position is comfortable.

---

## 10. FINANCIAL LICENSING CONFIRMATION

SpendSense does NOT require any financial-sector license or registration:

| License/Registration | Required? | Why Not |
|---------------------|-----------|---------|
| RBI Payment Aggregator | No | Does not process or settle payments |
| RBI NBFC | No | Does not lend, borrow, or intermediary |
| RBI Account Aggregator (NBFC-AA) | No | Does not pull data from banks via AA API |
| SEBI Investment Advisor | No | Does not provide investment advice |
| SEBI Research Analyst | No | Does not publish investment research |
| IRDAI Insurance Intermediary | No | Does not sell or advise on insurance |
| NPCI TPAP | No | Does not participate in UPI infrastructure |

**Boundary condition:** If SpendSense ever adds investment tracking with recommendations, bill payment facilitation, auto-savings linked to budgets, or direct bank API connections, the licensing requirements change. This must be reassessed for any feature beyond v1 scope.

---

## 11. UPCOMING REGULATIONS TO MONITOR

### 11.1 DPDPA Phase 2 — November 2026

Consent manager framework goes live. If SpendSense integrates with or acts as a consent manager, DPBI registration is required (₹2 crore net worth, Indian company). SpendSense is unlikely to need this, but monitor.

### 11.2 DPDPA Phase 3 — May 2027

Full substantive enforcement. **Hard deadline for compliance.** All obligations in Section 3.2 above become enforceable. Penalties up to ₹250 crore per violation.

### 11.3 Digital India Act (DIA)

Proposed replacement for the IT Act 2000. Public consultation expected in 2026, no draft bill published yet. Expected to introduce:
- Risk-based platform classification
- Updated intermediary obligations
- AI and emerging technology regulation

**Impact on SpendSense:** Unknown until draft is published. Monitor MeitY announcements.

### 11.4 AI Governance

- **MeitY IndiaAI Governance Guidelines (November 2025):** Non-binding, light-touch approach. No compliance action required currently.
- **AI (Ethics and Accountability) Bill 2025:** Private Member's Bill introduced in Lok Sabha, December 2025. Proposes statutory Ethics Committee, mandatory ethical reviews, bias audits, penalties up to ₹5 crore. Most Private Member's Bills do not pass. Monitor progress.

**Impact on SpendSense:** If either becomes binding law and applies to apps using third-party AI APIs, SpendSense's optional Gemini integration would need assessment. Current architecture (AI optional, per-use-case payloads with explicit field whitelists/blacklists) is already conservative.

### 11.5 RBI / NPCI Future Guidance

No current indication that RBI or NPCI will extend data handling norms to apps that passively read payment notifications. However:
- RBI authentication directions (effective April 1, 2026) may change notification content/format — impacts parser, not regulatory status
- NPCI could issue new guidance on third-party use of UPI transaction data at any time

**Action:** Monitor RBI circulars and NPCI updates quarterly.

---

## 12. COMPLIANCE ROADMAP

### 12.1 Before Beta Launch

| # | Action | Regulation | Effort |
|---|--------|------------|--------|
| 1 | **Write and publish privacy policy** | SPDI Rules 2011 (Rule 4), CPA 2019, Google Play | Medium — must cover all data collection, processing, AI pathway, user rights |
| 2 | **Implement in-app consent flows** | SPDI Rules 2011 (Rule 5), DPDPA (future) | Already designed in Section 5. Ensure language meets legal requirements. |
| 3 | **Build "view all data" screen** | SPDI Rules 2011 (Rule 5(5)) | Low — extend Settings screen |
| 4 | **Build "delete all data" action** | SPDI Rules 2011 (Rule 5(6)), DPDPA (future) | Low — single destructive action with confirmation |
| 5 | **Prepare Data Safety section** | Google Play policy | Low — fill out form truthfully |
| 6 | **Complete Financial Features declaration** | Google Play policy (per current published Play policy) | Low — declaration form in Play Console |
| 7 | **AI disclosure in-app** | CPA 2019 (no misleading claims), SPDI Rules (cross-border) | Already designed in Section 5. Verify wording covers legal requirements. |
| 8 | **Implement local data encryption** | SPDI Rules 2011 (Rule 8), DPDPA (future) | Medium — SQLite encryption at rest |

### 12.2 Before Public Launch (Post-Beta)

| # | Action | Regulation | Effort |
|---|--------|------------|--------|
| 9 | **Obtain legal opinion on AI pathway** | SPDI Rules (cross-border transfer), DPDPA | External — consult lawyer on whether AI payload fields (exact amounts, merchant names, etc.) constitute SPDI under cross-border transfer rules |
| 10 | **Terms of use** | CPA 2019 (unfair contracts) | Medium — plain-language, non-exploitative |
| 11 | **Resolve retention vs. delete-all-data tension** | DPDP Rules (1-year minimum) vs. locked Section 4 (delete all = full wipe) | Requires legal opinion — does the 1-year floor apply to a local-only app with no account system? Resolution may require a controlled change to either the retention approach or the delete-all-data semantics. |

### 12.3 Before May 2027

| # | Action | Regulation | Effort |
|---|--------|------------|--------|
| 12 | **DPDPA-compliant consent notice** | DPDPA Phase 3 | Medium — standalone notice with specific DPDPA language |
| 13 | **Breach notification capability** | DPDPA Phase 3 | Low for local-only app — build mechanism for completeness |
| 14 | **Data principal rights portal** | DPDPA Phase 3 | Medium — formal access/correct/erase flows |
| 15 | **Review cross-border negative list** | DPDPA Phase 3 | Ongoing — check if any AI server locations are restricted |

---

## 13. EVIDENCE CLASSIFICATION

Following Section 4's evidence discipline:

### Confirmed Facts (primary-source verified)
- SPDI Rules 2011 are current governing law for sensitive personal data (published rules, in force)
- Financial information is explicitly SPDI under Rule 3 (published text)
- DPDPA 2023 enacted, DPDP Rules 2025 notified (MeitY notification, published in Official Gazette)
- Google Play restricts READ_SMS to specific handlers (published policy)
- Financial Features declaration required for apps with financial features (Google Play Developer Program Policy, current published text — exact enforcement date not independently verified)
- No RBI license required for read-only expense tracker (RBI licensing framework published text)
- CPA 2019 applies to digital products (published Act text)

### High-Confidence Inferences
- DPDPA enforcement phases: Phase 1 active, Phase 2 November 2026, Phase 3 May 2027 (widely reported from DPDP Rules 2025 text; exact phase dates sourced from legal analyses of the notified rules, not independently verified against the Official Gazette by us)
- SpendSense is a data fiduciary under DPDPA (reads and processes personal financial data — fits the definition)
- SpendSense is not an intermediary under IT Act (processes user's own data, not third-party content)
- NPCI TPAP rules do not apply (SpendSense does not connect to UPI infrastructure)
- TRAI DND regulations do not restrict user-granted app permissions (regulations target senders, not recipients)
- AI payload fields may not constitute SPDI if individual cannot be identified from them alone — but the locked payload includes exact amounts and merchant names, which increases identifiability risk (reasonable interpretation, not legally tested)
- SpendSense unlikely to be designated as Significant Data Fiduciary (scale/stage mismatch)

### Uncertainties Requiring Legal Consultation
- Whether AI payload fields sent to Gemini API (which include exact amounts and merchant names for some use cases) constitute SPDI under Rule 7 cross-border transfer
- Whether "user provides own API key" shifts any data fiduciary responsibility for the AI call
- Whether NPCI could consider notification-parsed UPI data as "UPI transaction data" under its regulatory framework
- Exact DPDPA transition mechanics from SPDI Rules 2011

---

## 14. LOCKED DECISIONS REINFORCED

This section does not create new frozen logic. All regulatory compliance decisions align with and reinforce existing locked decisions:

| Locked Decision | Regulatory Reinforcement |
|-----------------|-------------------------|
| **M1 — Play Store = no READ_SMS** | Google Play SMS policy confirmed. Correct architectural decision. |
| **M3 — AI is optional** | Cross-border transfer concerns only apply when AI is enabled. Optional = reduced regulatory surface. |
| **M9 — All data local, raw text never sent to AI** | SPDI Rules, DPDPA, and RBI data localization spirit all favor local-first. Minimizing cross-border transfer is the legally safest position. |
| **M9 — Per-use-case AI payloads** | SPDI Rules and DPDPA require purpose limitation and data minimization. Defined payloads satisfy both. |
| **Section 5 — Honest privacy UX** | CPA 2019 prohibits misleading claims. Section 5's "reflect real OS permission scope" approach is legally correct. |
| **Section 5 — Explicit consent flows** | SPDI Rules (Rule 5) and DPDPA both require informed, freely-given consent. Already designed. |
| **Section 8 — Zero-budget, no server** | No server = no server-side data breach risk = reduced DPDPA breach notification burden. Local-only is the safest regulatory position for a single-developer app. |
