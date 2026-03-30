# SECTION 2 — PROBLEMS WE ARE SOLVING

> **Status:** LOCKED
> **Recovery status:** Reconstructed from locked conversation + supporting research document
> **Confidence:** High
> **Note:** The final problem map and severity logic are clearly locked. Some wording is reconstructed from conversation and research notes, but the strategic content is stable.

---

## 1. Section Objective

Define the exact problems SpendSense exists to solve. Every feature built in Section 4 must map back to at least one of these problems. If a feature doesn't solve a listed problem, we don't build it. No exceptions.

---

## 2. Original Core Problems (Founder-Identified)

### P1: Invisible Micro-Spending ("Where Did My Money Go?")

The most universal pain. Salary credited on the 26th. By the 15th, half is gone. The user has no memory of where it went. Small daily UPI transactions (₹50 here, ₹200 there) are invisible individually but devastating collectively. Nobody tracks a ₹49 recharge. But 10 of those a month = ₹490. Nobody feels a ₹150 Swiggy order. But 15 of those = ₹2,250.

The problem isn't overspending. It's invisible spending.

Rising costs and unpredictable digital spends leave many Indians "feeling lost managing money" [1][2].

### P2: Manual Tracking Friction (People Quit in 3 Days)

Every expense tracker assumes the user will manually enter transactions. Nobody does this consistently. After 3 days, they forget. The habit breaks. The app gets deleted. Manual tracking doesn't work — not because users are lazy, but because it interrupts the moment of spending.

The problem is friction. Tracking must be automatic or it will never happen.

### P3: Lifestyle Inflation Invisible Until Too Late

A common paradox — income increases but savings don't follow. This is called lifestyle inflation. A person earning ₹25K saves ₹3K. They get promoted to ₹40K. They expect to save ₹8K. Instead they save ₹2K. Why? Because expenses quietly expanded to fill the new income. Without visibility, they can't see it happening.

Financial experts call this lifestyle creep a major hidden threat [3]. Each pay raise quietly increases recurring expenses (new gadgets, subscriptions, rent) so people end up saving even less.

The problem is that lifestyle inflation is invisible until it's already happened.

### P4: Dirty Data — Failed Txns, Promos, Duplicates

(Learned firsthand building v1.) Bank SMS is noisy. Failed transactions show up as debits. Promotional SMS looks like a ₹33 transaction. One payment triggers 3 notifications from different sources. A user trying to track manually or with a dumb app sees corrupted data and stops trusting it.

The problem is that raw financial data is unreliable. It needs intelligent filtering.

### P5: Credits/Income Side Completely Ignored

Money coming IN is just as important as money going OUT. Salary, cashback, Amazon Pay rewards, money from siblings, refunds, gifts — these all affect the financial picture. Most apps focus only on debits. But a complete picture requires both sides of the ledger. Users need to log why money came in (e.g. salary vs. loan taken) just as much as why it went out.

The problem is that income tracking is an afterthought in most finance apps.

### P6: No Personalisation — Generic Budgets Useless

A bachelor in Bangalore spending on food and entertainment has completely different needs than a married person in Vizag sending money to parents and paying EMIs. Generic budgets (₹5K on groceries?) are useless. The app needs to learn YOUR patterns, not force you into a template.

The problem is that personal finance is personal — but most apps aren't.

### P7: Context Lost Within Hours of Payment

When you pay ₹500 to someone via GPay, you remember exactly what it was for. 3 days later, you don't. If the app asks you immediately — right when the payment happens — you'll answer. If it asks you a week later, you'll guess or skip.

The problem is that context is lost within hours. The app must capture it immediately.

---

## 3. Additional Research-Backed Problems

### P8: Privacy & Permission Fear

Many users distrust apps that need deep access. Finance apps typically ask for SMS and bank access, which people find invasive [4][5]. As Zerodha's CEO Nithin Kamath notes, bank apps asking for SMS/contacts "make no sense" [5]. Users may refuse permissions, so an app must balance automation with privacy. If people fear data misuse, they won't use the app at all.

This isn't just a feature decision — it's a trust architecture decision that affects everything. The permission strategy must be:
- **Transparent** — tell the user exactly what we read and why
- **Minimal** — notification access + optional SMS, never contacts/location
- **Local-first** — all data stays on the phone, no cloud upload in v1

### P9: Data Fragmentation — UPI + Wallets + Cash + Gifts

Money flows through multiple channels — UPI, different banks, wallets (Paytm/Amazon/PhonePe), and even partial cash. Most apps can't unify all this. Rewards points or gift codes (Amazon Pay credits, coupons) often go untracked. Peer-to-peer loans (borrowing from friends, or pocket money from parents) can slip through. Fragmented data means the app might miss big parts of a user's cash flow unless it specifically accounts for these sources.

### P10: Hidden Recurring Charges (Subscriptions, EMIs)

Fixed or hidden recurring costs (rent, utilities, subscriptions, EMIs) often escape attention until they hit the bank balance. Many trackers either ignore them or group them poorly. Users need to know that Netflix and gym fees each take ₹X/month. Missing a subscription is a common blind spot. Emerging apps plan to auto-detect and alert about recurring charges, highlighting how big this gap is [6].

### P11: Joint and Family Finances Untracked

Households often share money. Spouses or families may use one app jointly or multiple apps separately. Without features for shared budgets or multi-user access, it's hard to see household-level spending. A tracking app should handle shared accounts/budgets seamlessly, otherwise couples may not bother with it.

### P12: Mis-Categorization Kills Trust

Automatic categorization is useful but imperfect. Merchant names or UPI IDs can be ambiguous, causing wrong tags. If an app frequently misclassifies expenses, users lose trust and stop using it. BillCut notes that apps still require manual checks for accuracy [4]. The very "automation" promise can backfire if it's seen as unreliable.

### P13: Connectivity Gaps — Offline/Cash Payments Missed

Sometimes payments (especially cash or offline UPI) won't immediately appear via SMS or API. Users may complete an expense but the app doesn't register it. Connectivity issues or unlinked payments create blind spots. Over time, these mismatches accumulate, frustrating users who expect a real-time, comprehensive ledger.

### P14: Notification Fatigue — Too Many Prompts

Asking questions every time can overwhelm users. If the app pings too often (or at the wrong time), people may disable notifications. The balance between prompting for context and over-alerting is delicate. Too many alerts become "background noise" [7].

**Critical example (from co-founder discussion):** Someone rushing to catch a bus, taps ₹20 for auto, taps ₹150 for snack, taps ₹50 for water — that's 3 notifications in 10 minutes while they're running. They'll swipe away all three. Then the context is lost forever. This is a chain reaction: if notifications annoy users, they disable them. If they disable them, we lose context capture. If we lose context, the app becomes useless.

---

## 4. Co-Founder Added Problems

### P15: No "Financial Education" Moment

Most apps show numbers but don't teach the user anything. When someone sees "Food: ₹6,500" they think "ok." But if the app says "You spent ₹6,500 on food — that's 22% of your income. Last month it was 18%. The increase came from 4 extra Swiggy orders on weekends" — NOW they understand.

Insight without context is just data. Context without action is just noise.

### P16: No Emotional Connection

Money is emotional. A ₹2,000 birthday gift to your sister feels different from a ₹2,000 electricity bill. But both show as "-₹2,000" in every tracker. The app should understand that some spending is joyful (gifts, celebrations) and some is painful (fines, penalties, unexpected repairs). This changes how insights are presented.

---

## 5. Final 16-Problem Map with Severity

| # | Problem | Source | Severity |
|---|---------|--------|----------|
| P1 | Invisible micro-spending ("where did ₹40K go?") | Founder original | Critical |
| P2 | Manual tracking friction (people quit in 3 days) | Founder original | Critical |
| P3 | Lifestyle inflation invisible until too late | Founder original | Critical |
| P4 | Dirty data — failed txns, promos, duplicates | Founder original + v1 experience | Critical |
| P5 | Credits/income side completely ignored | Founder original | High |
| P6 | No personalisation — generic budgets useless | Founder original | High |
| P7 | Context lost within hours of payment | Founder original | Critical |
| P8 | Privacy & permission fear (Nithin Kamath quote) | Research | Critical |
| P9 | Data fragmentation — UPI + wallets + cash + gifts | Research | High |
| P10 | Hidden recurring charges (subscriptions, EMIs) | Research | High |
| P11 | Joint/family finances untracked | Research | Medium (Phase 2) |
| P12 | Mis-categorization kills trust | Research | Critical |
| P13 | Connectivity gaps — offline/cash payments missed | Research | Medium |
| P14 | Notification fatigue — too many prompts | Research + co-founder discussion | Critical |
| P15 | No "financial education" moment — insight without context | Co-founder added | Critical |
| P16 | No emotional connection — all spending looks the same | Co-founder added | Critical |

**Totals: 10 Critical, 4 High, 2 Medium**

---

## 6. Severity Logic

| Severity | Meaning |
|----------|---------|
| Critical | If we don't solve this, users will uninstall |
| High | Users tolerate it but competitors who solve it will win |
| Medium | Important but can wait for Phase 2 |

**P14 severity upgrade rationale:** Originally assessed as High, upgraded to Critical during co-founder discussion. The chain reaction logic: if notifications annoy users → they disable them → we lose context capture → the app becomes useless. This makes it an uninstall-level problem.

---

## 7. Locked Decision Summary

- **16 problems identified and locked** — 7 founder-originated, 7 research-backed, 2 co-founder added
- **10 Critical, 4 High, 2 Medium**
- **Lock rule: Every feature built in Section 4 must map back to at least one of these 16 problems. If a feature doesn't solve a listed problem, we don't build it. No exceptions.**
- P11 (joint/family finances) and P13 (connectivity gaps) are explicitly deferred to Phase 2 as Medium severity
- P8 (privacy) is treated as an architecture-level decision, not just a feature — it affects the entire trust model

---

## 8. Research Notes / Citations

| Ref | Source |
|-----|--------|
| [1] [4] [6] | Finance Apps That Auto-Sort Your Monthly Expenses — BillCut — https://www.billcut.com/blogs/finance-apps-that-auto-sort-your-monthly-expenses/ |
| [2] [7] | Budgeting Apps in India: Which Really Work? — BillCut — https://www.billcut.com/blogs/budgeting-apps-india-which-work/ |
| [3] | 8 simple habits that prevent lifestyle creep and boost your savings — The Economic Times — https://economictimes.indiatimes.com/wealth/save/8-simple-habits-that-prevent-lifestyle-creep-and-boost-your-savings/lifestyle-inflation-is-quietly-killing-your-wealth/slideshow/129649337.cms?from=mdr |
| [5] | 'Makes no sense': Zerodha's Nithin Kamath says he doesn't use net banking apps, calls access to SMS, contacts 'invasive' — Mint — https://www.livemint.com/industry/banking/makes-no-sense-zerodha-s-nithin-kamath-says-he-doesn-t-use-net-banking-apps-calls-access-to-sms-contacts-invasive-11773740634889.html |
