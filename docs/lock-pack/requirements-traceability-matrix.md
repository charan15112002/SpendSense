# Requirements Traceability Matrix

Status: Active
Purpose: Map locked concepts to implementation consequences and test areas.

| Lock ID | Source | Locked Requirement | Implementation Consequence | Primary Test Area |
|---|---|---|---|---|
| S1-C1 | Section 1 | Phase 1 launch user is young salaried professionals in India | UX, defaults, examples, and cycle logic must fit this user first | Onboarding, Home, cycle UX |
| S1-C2 | Section 1 | Product is India-first, UPI-heavy, mobile-first | Currency, formatting, payment flows, and constraints must reflect Indian usage | Formatting, source capture |
| S2-P01 | Section 2 | Solve invisible micro-spending | Detection and summaries must capture small frequent spends | Detection, Home totals |
| S2-P02 | Section 2 | Manual tracking friction kills usage | Automation and low-friction prompting are required | Prompt delivery, onboarding |
| S2-P03 | Section 2 | Lifestyle inflation must become visible | Trend and budget features must expose drift only when confidence is sufficient | Trust ramp, insights |
| S2-P04 | Section 2 | Raw finance data is dirty | Filtering, state machine, duplicate handling, and quarantine are required | Detection, quarantine |
| S2-P05 | Section 2 | Income/credit side matters too | Inflow handling cannot be collapsed into one bucket | Inflow summary, classification |
| S2-P06 | Section 2 | Generic budgets are useless | Personalization and adaptive logic are required | Budget UX, pattern learning |
| S2-P07 | Section 2 | Context fades quickly | Purpose capture must happen close to payment time | Prompt timing |
| S2-P08 | Section 2 | Permission fear is real | Permission copy and privacy UX must be transparent and minimal | Onboarding, settings |
| S2-P09 | Section 2 | Money is fragmented across channels | App must unify multiple instruments without lying | Transaction model, search |
| S2-P10 | Section 2 | Budget systems are often unrealistic | Budget logic must emerge from observed reality | Budget setup |
| S2-P11 | Section 2 | Most users do not want guilt or judgment | Language and visuals must stay factual and calm | Copy, alerts, insights |
| S2-P12 | Section 2 | Users lose trust when the app is wrong | Confidence gating and explainability are mandatory | Confidence states, detail view |
| S2-P13 | Section 2 | Failed/reversed/pending states are not spend | Lifecycle handling must be explicit | Detection, summaries |
| S2-P14 | Section 2 | Notification fatigue is a real risk | Prompting must be selective, batched, capped, and configurable | Prompt delivery |
| S2-P15 | Section 2 | Users need meaningful summaries, not raw logs | Home and Money surfaces must translate movement into clarity | Home, Money tab |
| S2-P16 | Section 2 | Emotional money context matters | Design must be non-judgmental and culturally aware | Copy, insights |
| S3-S1 | Section 3 | Entry wedge must be brutally narrow and reliable | v1 must stay focused on truth in money movement, not broad fintech scope | Scope control |
| S3-S2 | Section 3 | SpendSense moat is a system, not one feature | Source fusion, state machine, purpose memory, adaptive identity, explainable AI, confidence UX must connect coherently | Architecture review |
| S3-S3 | Section 3 | Competitors show what moved, not why | Purpose and reason systems are first-class, not decorative | Purpose capture, ontology |
| S3-S4 | Section 3 | Trust is won by honesty, reliability, and restraint | No loan offers, no ads, no manipulative finance-bro UX in v1 | UX review |
| S4-M1 | Section 4 | Play build uses NotificationListenerService only; no READ_SMS dependency | Build flavors and permission flows must diverge by distribution | Android implementation |
| S4-M2 | Section 4 | Sideload build uses READ_SMS primary plus notifications secondary | SMS path must exist only in sideload flavor | Android implementation |
| S4-M3 | Section 4 | 6-axis transaction model is canonical | Database, types, parsing, summaries, and detail screens must all align | Data model |
| S4-M4 | Section 4 | Failed/reversed/pending never count as spend | Totals and insights must exclude them correctly | Home totals |
| S4-M5 | Section 4 | Credit card bill payment is liability settlement, not spend | Card ledger and summaries must preserve this rule | Credit card ledger |
| S4-M6 | Section 4 | Self-identity graph is required for self-transfer handling | Identity management UI and transfer logic must be explicit | Identity graph |
| S4-M7 | Section 4 | 3-tier intelligence: rules, patterns, optional AI | App must still work without AI | AI-off mode |
| S4-M8 | Section 4 | AI is provider-agnostic and optional | No feature may hard-depend on Gemini | Settings, AI integration |
| S4-M9 | Section 4 | Source trust and quarantine are required | Suspicious items must be isolated from normal flow | Quarantine UX |
| S4-M10 | Section 4 | Cash wallet is part of v1 | ATM withdrawals and manual cash spends need dedicated UX | Cash wallet |
| S4-M11 | Section 4 | Privacy contract is exact and per use case | Onboarding and AI enable copy must match technical behavior | Privacy review |
| S4-M12 | Section 4 | Platform constraints and unsupported scenarios are real | UX must surface low-RAM, revoked access, work-profile, OEM kill issues | Constraint UX |
| S4-M13 | Section 4 | 14 field test items remain intentional unknowns | Build and testing must preserve these as test gates, not assumptions | Test planning |
| S5-UX1 | Section 5 | Truth in 2 seconds | Home screen must answer the core question fast | Home UX |
| S5-UX2 | Section 5 | Action in 3 taps | Key flows must stay low-friction | UX interaction testing |
| S5-UX3 | Section 5 | Zero guilt | Language, color, and alerts must stay factual, not moralizing | Copy audit |
| S5-UX4 | Section 5 | 4-tab IA is Home, Txns, Money, Settings | Navigation must preserve this mental model | Navigation |
| S5-UX5 | Section 5 | Money tab holds budget, cards, and cash wallet | Credit cards and cash cannot be buried in Settings | Money tab |
| S5-UX6 | Section 5 | Home summary must be honest about confirmed vs estimated and inflow confidence | Summary logic and labels must match the lock exactly | Home summary |
| S5-UX7 | Section 5 | Unified 5-state system: Confirmed, Learned, Suggested, Unclassified, Quarantined | Badges, list treatment, and totals must all use one coherent state model | Transaction list |
| S5-UX8 | Section 5 | Smart notifications are the default real-time purpose-capture path | Prompt delivery must not assume SpendSense is on screen | Prompt delivery |
| S5-UX9 | Section 5 | Trust ramp is evidence-based with soft floors and ceilings | Feature unlocks must depend on evidence, not just days | Trust ramp |
| S5-UX10 | Section 5 | Platform limitations must have visible UX behavior | Warning states and fallback modes must be implemented | Settings, Home warnings |
| S6-L1 | Section 6 | Low-confidence review is a queue/backlog flag, not a new status-axis value | Data model and workflow must keep review state separate from canonical transaction status | Detection, storage |
| S6-L2 | Section 6 | Only user-added custom packages may enter low-trust unverified-source scoring | Non-whitelisted packages must be discarded; only explicit unverified-source packages can be reviewed | Detection, quarantine |
| S6-L3 | Section 6 | Unclassified aging model is 24h queue, 7d backlog, 30d final archive/classify prompt | Prompt backlog behavior must match this exact lifecycle | Prompt delivery |
| S6-L4 | Section 6 | AI may not override weak structural authenticity | Low-trust messages must remain quarantined even if AI seems confident | Fake defense, quarantine |
| S6-L5 | Section 6 | Salary evaluation is signal-based for any eligible inflow, not a “large credit” shortcut | Income logic must not depend on amount size as the primary gate | Cycle engine, inflow handling |
