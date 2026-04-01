# M2 Field Test Procedure — Pre-Path-Freeze Tests

**Build:** `app-playstore-release.apk` for T1, T2, T11, T12
**Device:** Pixel 8, Android 16
**Tester:** Charan (founder)
**Date:** After M2 build verified

---

## T1: GPay Notification Parsing

**Purpose:** Verify that GPay payment notifications are parsed correctly across banks.
**Decision it informs:** Play Store detection coverage and template library quality.
**Target:** 50+ notifications across available banks.

### Setup
1. Install `app-playstore-release.apk` on Pixel 8
2. Open SpendSense → go to Settings
3. Grant notification access (toggle SpendSense ON in Notification Access settings)
4. Confirm listener status shows "Connected" in app

### Test Steps
1. Open GPay on Pixel 8
2. Make a small UPI payment (₹1-₹10) to any merchant or contact
3. Wait 5 seconds
4. Open SpendSense
5. Check if a transaction appeared
6. Record in the table below:
   - Payment app used (GPay/PhonePe/Paytm)
   - Bank account used (HDFC/SBI)
   - Amount sent
   - Did SpendSense detect it? (Yes/No)
   - Was amount correct? (Yes/No)
   - Was merchant name captured? (Yes/No/Partial)
   - Raw notification text (screenshot or copy)

### Repeat for:
- [ ] GPay with HDFC account — 5 payments
- [ ] GPay with SBI account — 5 payments
- [ ] PhonePe with HDFC account — 5 payments (if available)
- [ ] PhonePe with SBI account — 5 payments (if available)
- [ ] Paytm — 5 payments (if available)
- [ ] Receive payment (inflow) — 3 payments

### Record Table

| # | App | Bank | Amount | Detected? | Amount OK? | Merchant? | Notes |
|---|-----|------|--------|-----------|------------|-----------|-------|
| 1 | | | | | | | |
| 2 | | | | | | | |
| ... | | | | | | | |

### What to Report
- Total payments made
- Total detected by SpendSense
- Detection rate (detected / total × 100%)
- Any cases where merchant was "Unknown"
- Any cases where amount was wrong
- Screenshot of any notification that was NOT detected

---

## T2: Listener Battery Survival (72-Hour Soak Test)

**Purpose:** Does the NotificationListenerService survive 72 hours without user interaction?
**Decision it informs:** Is a foreground service needed on Pixel 8?

### Setup
1. Same install from T1 (notification access already granted)
2. Note the current time: ___________
3. Ensure battery optimization is at DEFAULT settings (do not manually exclude SpendSense)
4. Do NOT open SpendSense for the next 72 hours

### Test Steps
1. **Hour 0:** Make 1 payment via GPay. Verify SpendSense detected it.
2. **Close SpendSense** — do not open it again for 72 hours.
3. **Hour 24:** Make 1 payment via GPay. Do NOT open SpendSense.
4. **Hour 48:** Make 1 payment via GPay. Do NOT open SpendSense.
5. **Hour 72:** Make 1 payment via GPay. Now open SpendSense.
6. **Check:** Are all 4 transactions present?

### Record Table

| Time | Payment Made? | Amount | Detected? (check at Hour 72) |
|------|--------------|--------|------------------------------|
| Hour 0 | | | |
| Hour 24 | | | |
| Hour 48 | | | |
| Hour 72 | | | |

### What to Report
- Were all 4 transactions captured?
- If any were missed: which hour(s)?
- Was the listener still connected when you opened the app at Hour 72?
- Battery percentage at Hour 0 and Hour 72
- Did you charge the phone during the test? (Yes/No)

### Possible Outcomes
- **All 4 detected:** Listener survives on Pixel 8 without foreground service → good
- **Some missed:** Note which hours were missed → foreground service may be needed
- **None after Hour 0:** Listener was killed → foreground service likely needed

---

## T11: Foreground Service Necessity

**Purpose:** Compare listener survival WITH and WITHOUT a foreground service.
**Decision it informs:** Whether a persistent notification is needed on Pixel 8.

**Note:** This test runs AFTER T2. If T2 shows 100% survival, T11 may not be needed on Pixel 8. Run T11 only if T2 shows missed transactions.

### Setup (only if T2 showed misses)
1. A future build will include a foreground service option
2. Install that build
3. Enable the foreground service in Settings
4. Repeat the T2 protocol (72-hour soak)

### What to Report
- Same table as T2, but with foreground service enabled
- Compare results: did foreground service improve survival?

---

## T12: Listener Rebind After Kill

**Purpose:** Does the listener automatically reconnect after being killed?
**Decision it informs:** Whether a watchdog mechanism is needed.

### Setup
1. Same install from T1

### Test Steps

**Scenario A: Force Stop**
1. Make a payment → verify detected
2. Go to Android Settings → Apps → SpendSense → Force Stop
3. Wait 30 seconds
4. Make another payment
5. Open SpendSense
6. Was the payment detected? (Yes/No)

**Scenario B: Reboot**
1. Make a payment → verify detected
2. Reboot phone completely
3. Wait for phone to fully start (2 minutes)
4. Make a payment
5. Open SpendSense
6. Was the payment detected? (Yes/No)

**Scenario C: Battery Kill Simulation**
1. Make a payment → verify detected
2. Go to Android Settings → Apps → SpendSense → Battery → Restricted
3. Wait 1 hour
4. Make a payment
5. Open SpendSense
6. Was the payment detected? (Yes/No)
7. Reset battery setting to default after test

### Record Table

| Scenario | Kill Method | Payment After Kill Detected? | Notes |
|----------|-----------|------------------------------|-------|
| A | Force Stop | | |
| B | Reboot | | |
| C | Battery Restricted | | |

### What to Report
- Which scenarios recovered automatically?
- Which scenarios needed the user to open the app?
- Did the listener status show "Connected" or "Disconnected" after each scenario?

### Possible Outcomes
- **All scenarios recover:** No watchdog needed on Pixel 8
- **Force stop fails, reboot works:** Standard behavior — document as known limitation
- **Battery restricted fails:** Need to guide users away from Restricted mode

---

## General Instructions for All Tests

1. **Use release APK only** — never debug builds (v1 learning)
2. **Do not clear app data** between tests unless instructed
3. **Take screenshots** of:
   - The notification itself (notification shade)
   - SpendSense transaction list showing detected transaction
   - Any error or missing detection
4. **Report raw results** — do not interpret or fix. Just record what happened.
5. If something breaks or the app crashes, note what you were doing and take a screenshot.
