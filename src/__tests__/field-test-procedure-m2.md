# M2 Field Test Procedure — Pre-Path-Freeze Tests

**YOUR JOB:** Install the app, make payments, export the evidence file. That's it.
**THE APP'S JOB:** Record everything automatically. You do NOT need to fill any tables or write anything down.

**Build:** `app-playstore-release.apk` (or `app-sideload-release.apk` for SMS tests)
**Device:** Pixel 8
**Tester:** Charan

---

## PART 1: Getting the App on Your Phone

### Step 1: Connect your phone to your laptop

1. Get a USB-C cable.
2. Plug one end into your Pixel 8 phone.
3. Plug the other end into your laptop.
4. Your phone will show a popup: "Allow USB debugging?"
5. Tap **"Allow"**.
6. If it asks "Always allow from this computer?" — check the box and tap **"Allow"**.

If you do NOT see this popup, you need to turn on USB debugging first:

1. On your phone, open **Settings**.
2. Scroll down and tap **About phone**.
3. Find **Build number** and tap it **7 times** fast.
4. It will say "You are now a developer!"
5. Go back to **Settings**.
6. Tap **System** → **Developer options**.
7. Find **USB debugging** and turn it **ON**.
8. Now unplug and replug the USB cable — you should see the popup.

### Step 2: Install the app

1. On your laptop, open a terminal (search "Terminal" in Windows Start Menu).
2. Type this command and press Enter:

```
adb install "C:\Users\Charan\Desktop\SpendSense - Copy\android\app\build\outputs\apk\playstore\release\app-playstore-release.apk"
```

3. Wait. It will say **"Success"** when done.
4. If it says "device not found" — unplug and replug the USB cable, then try again.

For sideload testing (SMS tests), use this command instead:

```
adb install "C:\Users\Charan\Desktop\SpendSense - Copy\android\app\build\outputs\apk\sideload\release\app-sideload-release.apk"
```

### Step 3: Open SpendSense on your phone

1. On your phone, find **SpendSense** in your app list.
2. Tap to open it.

---

## PART 2: Setting Up Notification Access

SpendSense needs permission to read your payment notifications. Without this, it cannot detect any payments.

### Step 4: Give notification access to SpendSense

1. On your phone, open **Settings**.
2. Tap **Notifications**.
3. Tap **Notification access** (or **Device & app notifications** — it varies).
4. Find **SpendSense** in the list.
5. Tap the toggle to turn it **ON**.
6. A warning will appear: "Allow SpendSense to read all notifications?"
7. Tap **"Allow"**.

After this, go back to SpendSense. It should now be ready to detect payments.

### Step 5: Make sure notifications are ON for your payment apps

SpendSense reads notifications from these apps. For each app you have installed, make sure notifications are turned ON:

**Google Pay (GPay):**
1. Open **Settings** → **Notifications** → **App notifications**.
2. Find **GPay** and tap it.
3. Make sure the toggle is **ON**.

**PhonePe:**
1. Same steps. Find **PhonePe** in the list.
2. Make sure the toggle is **ON**.

**Paytm:**
1. Same steps. Find **Paytm** in the list.
2. Make sure the toggle is **ON**.

**SBI YONO:**
1. Same steps. Find **SBI YONO** in the list.
2. Make sure the toggle is **ON**.

**SBI YONO Lite:**
1. Same steps. Find **YONO Lite SBI** in the list.
2. Make sure the toggle is **ON**.

**HDFC Mobile Banking:**
1. Same steps. Find **HDFC Bank** in the list.
2. Make sure the toggle is **ON**.

**ICICI iMobile:**
1. Same steps. Find **iMobile Pay** in the list.
2. Make sure the toggle is **ON**.

**Kotak Mobile Banking:**
1. Same steps. Find **Kotak** in the list.
2. Make sure the toggle is **ON**.

**Axis Mobile:**
1. Same steps. Find **Axis Mobile** in the list.
2. Make sure the toggle is **ON**.

You only need to do this for the apps you actually have installed on your phone.

---

## PART 3: Enable Diagnostic Mode

Diagnostic mode tells the app to record detailed evidence of every payment it detects. This is how we prove the app works — you do NOT need to write anything down.

### Step 6: Turn on diagnostic mode in SpendSense

1. Open **SpendSense** on your phone.
2. The app starts in **Diagnostic Mode (Mode B)** by default on debug builds.
3. If using a release build: Go to **Settings** inside SpendSense → find **Diagnostic Mode** → tap to switch to **Mode B (Full Capture)**.

When Mode B is active, the app silently records:
- Every notification it receives
- Every decision it makes (accept, reject, trust score, quarantine)
- Every platform event (listener connected, disconnected, rebind)

You will NOT see anything different on screen. It works in the background.

---

## PART 4: Running the Tests

### TEST T1: GPay Notification Parsing

**What this tests:** Can SpendSense detect payments from Google Pay?

**What you do:**

1. Open **Google Pay** on your phone.
2. Send ₹1 to any contact or merchant.
3. Wait 5 seconds.
4. Open **SpendSense** — you should see the transaction.
5. Go back to **Google Pay**.
6. Send another ₹1 payment to a different contact or merchant.
7. Wait 5 seconds.
8. Open **SpendSense** — you should now see 2 transactions.

**Keep going.** Make at least **10 payments** with GPay. Try different amounts (₹1, ₹5, ₹10, ₹50, ₹100). Try different contacts and merchants.

If you have **multiple bank accounts** linked to GPay (like HDFC and SBI), try making payments from each bank account.

**If you have other payment apps installed:**

9. Open **PhonePe**. Make 5 payments. Check SpendSense after each.
10. Open **Paytm**. Make 5 payments. Check SpendSense after each.

**If something goes wrong:**
- If a payment is NOT detected, take a screenshot of the notification. That's it. The app has already recorded that it missed it.
- Do NOT try to figure out why. The evidence bundle will tell us.

### TEST T2: Listener Battery Survival (72-Hour Soak Test)

**What this tests:** Does SpendSense keep working for 3 days without you opening it?

**What you do:**

1. Make 1 payment with GPay. Open SpendSense. Confirm it detected it.
2. **Close SpendSense.** Do NOT open it again for 3 days.
3. Use your phone normally for the next 3 days. Do NOT open SpendSense.
4. **After 24 hours:** Make 1 payment with GPay. Do NOT open SpendSense.
5. **After 48 hours:** Make 1 payment with GPay. Do NOT open SpendSense.
6. **After 72 hours:** Make 1 payment with GPay. NOW open SpendSense.
7. Check: Are all 4 transactions there?

**Important rules:**
- Do NOT exclude SpendSense from battery optimization. Leave everything at default.
- Do NOT force-stop SpendSense during this test.
- You can charge your phone normally during the test.

### TEST T12: Listener Rebind After Kill

**What this tests:** Does SpendSense recover after being force-stopped or after a phone reboot?

**Scenario A — Force Stop:**

1. Make 1 payment with GPay. Open SpendSense. Confirm it detected it.
2. Go to **Settings** → **Apps** → **SpendSense** → tap **Force stop**.
3. Tap **OK** to confirm.
4. Wait 30 seconds.
5. Make another payment with GPay.
6. Open **SpendSense**.
7. Is the second payment there?

**Scenario B — Reboot:**

1. Make 1 payment with GPay. Open SpendSense. Confirm it detected it.
2. **Restart your phone** (hold power button → Restart).
3. Wait for the phone to fully start up (about 2 minutes).
4. Make another payment with GPay.
5. Open **SpendSense**.
6. Is the second payment there?

**Scenario C — Battery Restricted:**

1. Make 1 payment with GPay. Open SpendSense. Confirm it detected it.
2. Go to **Settings** → **Apps** → **SpendSense** → **Battery** → tap **Restricted**.
3. Wait 1 hour.
4. Make another payment with GPay.
5. Open **SpendSense**.
6. Is the second payment there?
7. **After the test:** Go back to **Settings** → **Apps** → **SpendSense** → **Battery** → set it back to **Optimized** (the default).

---

## PART 5: Exporting the Evidence

After you finish all tests (or at the end of each day), you need to export the evidence bundle. This is the file that proves what the app did.

### Step 7: Export evidence from SpendSense

1. Open **SpendSense** on your phone.
2. Go to **Settings** (or the menu).
3. Tap **Export Evidence Bundle**.
4. Choose **Save to Downloads** OR tap **Share** to send it directly.

**If you chose "Save to Downloads":**
- The evidence is saved to your phone's Downloads folder.
- Connect your phone to your laptop with USB.
- Open the phone's storage on your laptop.
- Go to **Downloads** → **SpendSense-Evidence** → you'll see a folder named with the build ID.
- Copy that entire folder to your laptop.

**If you chose "Share":**
- The share menu will open.
- You can send the files via WhatsApp, email, Google Drive, or any other app.
- Send it to yourself or directly to the Guardian chat.

### Step 8: Send the evidence to Guardian

Copy the evidence folder and paste this message to Guardian:

```
M2 Field Test Evidence attached.
Build: [build ID shown in the export folder name]
Device: Pixel 8
Tests run: T1, T2, T12 (list whichever you ran)
```

That's it. Guardian will analyze the evidence files automatically.

---

## PART 6: What to Do If Something Goes Wrong

- **App crashes:** Take a screenshot of the error. Then reopen SpendSense and export evidence. The crash will be in the platform trace.
- **Payment not detected:** Take a screenshot of the notification shade showing the payment notification. The evidence bundle will show it was missed.
- **Listener shows "Disconnected":** Take a screenshot. Then try: Settings → Notifications → Notification access → turn SpendSense OFF then ON again.
- **"Export Evidence" not showing:** Make sure you are in **Mode B** (diagnostic mode). Mode A does not collect full evidence.

**Screenshots are only needed when something goes WRONG.** When things work correctly, the evidence bundle captures everything automatically.

---

## Summary — Your Checklist

- [ ] Phone connected to laptop with USB
- [ ] SpendSense installed via `adb install` command
- [ ] Notification access granted to SpendSense
- [ ] Notifications ON for all payment apps you have
- [ ] Diagnostic Mode B is active
- [ ] T1: Made 10+ payments with GPay, checked SpendSense after each
- [ ] T1: Made 5+ payments each with PhonePe and Paytm (if installed)
- [ ] T2: Made 4 payments over 72 hours without opening SpendSense
- [ ] T12: Tested force stop, reboot, and battery restricted scenarios
- [ ] Exported evidence bundle
- [ ] Sent evidence to Guardian

**Remember: You do NOT fill in any tables. You do NOT write down results. The app records everything. Your only job is: install, pay, export.**
