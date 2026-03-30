/**
 * UserProfileService.js
 * 
 * Manages user profile, preferences, cycle detection,
 * and multi-account configuration from onboarding.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = 'spendsense_profile';
const ACCOUNTS_KEY = 'spendsense_accounts';
const REPAYMENTS_KEY = 'spendsense_repayments';

export class UserProfileService {

  // ── Load / Save ──────────────────────────────────────────────

  static async loadProfile() {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  static async saveProfile(profile) {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  static async isOnboarded() {
    const p = await this.loadProfile();
    return !!p?.onboardingComplete;
  }

  // ── Cycle calculation ────────────────────────────────────────

  /**
   * Get the current financial cycle's start and end dates.
   * 
   * cycleType options:
   *   '1'      → Calendar month (1st to last day)
   *   'salary' → Detected from salary SMS (dynamic)
   *   'custom' → User-specified start day
   */
  static getCurrentCycle(profile) {
    const today = new Date();

    if (profile.cycleType === '1') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start, end, label: `${this.monthLabel(start)} cycle` };
    }

    const day = profile.cycleDay || 26;
    let cycleStart, cycleEnd;

    if (today.getDate() >= day) {
      // We're past the cycle start day this month
      cycleStart = new Date(today.getFullYear(), today.getMonth(), day);
      cycleEnd = new Date(today.getFullYear(), today.getMonth() + 1, day - 1);
    } else {
      // Cycle started last month
      cycleStart = new Date(today.getFullYear(), today.getMonth() - 1, day);
      cycleEnd = new Date(today.getFullYear(), today.getMonth(), day - 1);
    }

    return {
      start: cycleStart,
      end: cycleEnd,
      label: `${cycleStart.getDate()} ${this.monthName(cycleStart)} – ${cycleEnd.getDate()} ${this.monthName(cycleEnd)}`,
      dayNumber: Math.floor((today - cycleStart) / 86400000) + 1,
      totalDays: Math.floor((cycleEnd - cycleStart) / 86400000) + 1,
    };
  }

  /**
   * When a salary credit SMS is detected, offer to use that date
   * as the new cycle start day.
   */
  static async handleSalaryDetected(salaryTxn, profile) {
    const salaryDay = new Date(salaryTxn.timestamp).getDate();

    if (profile.cycleType === 'salary') {
      // Auto-update cycle to salary date
      profile.cycleDay = salaryDay;
      await this.saveProfile(profile);
      return { updated: true, newDay: salaryDay };
    }

    // Ask user if they want to update
    return {
      updated: false,
      suggestion: salaryDay,
      message: `Salary credited on ${salaryDay}th. Update your cycle to start on ${salaryDay}th?`,
    };
  }

  // ── Multi-account management ─────────────────────────────────

  static async loadAccounts() {
    const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : this.defaultAccounts();
  }

  static async saveAccounts(accounts) {
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  static async addAccount(account) {
    const accounts = await this.loadAccounts();
    account.id = `acc_${Date.now()}`;
    accounts.push(account);
    await this.saveAccounts(accounts);
    return account.id;
  }

  static defaultAccounts() {
    return [
      { id: 'acc_primary', name: 'Primary Account', type: 'bank', isPrimary: true, balance: 0, icon: '🏦', color: '#2196F3' },
    ];
  }

  /**
   * Identify which account a transaction belongs to based on:
   * - SMS sender (bank code)
   * - Account number (last 4 digits)
   * - Source app
   */
  static matchAccountForTxn(txn, accounts) {
    // Try to match by account number
    if (txn.account) {
      const last4 = txn.account.replace(/X/g, '');
      const match = accounts.find(a => a.accountNumber?.endsWith(last4));
      if (match) return match.id;
    }

    // Try by source app (wallet match)
    if (txn.sourceApp === 'Amazon Pay') {
      const az = accounts.find(a => a.type === 'wallet' && a.bank === 'Amazon');
      if (az) return az.id;
    }
    if (txn.sourceApp === 'Paytm') {
      const pt = accounts.find(a => a.type === 'wallet' && a.bank === 'Paytm');
      if (pt) return pt.id;
    }

    // Default to primary
    return accounts.find(a => a.isPrimary)?.id || accounts[0]?.id;
  }

  /**
   * Detect if a debit → credit pair is a self-transfer.
   * Checks: similar time, similar amount, different accounts.
   */
  static detectSelfTransfer(newTxn, recentTxns, accounts) {
    const tenMinutes = 10 * 60 * 1000;
    return recentTxns.find(existing => {
      if (existing.id === newTxn.id) return false;
      const timeDiff = Math.abs(new Date(newTxn.timestamp) - new Date(existing.timestamp));
      const amountMatch = Math.abs(newTxn.amount - existing.amount) < 2; // ₹2 tolerance for rounding
      const differentAccount = existing.accountId !== newTxn.accountId;
      const oppositeFlow = (newTxn.flow === 'credit' && existing.flow === 'debit') ||
                           (newTxn.flow === 'debit' && existing.flow === 'credit');
      return timeDiff < tenMinutes && amountMatch && differentAccount && oppositeFlow;
    });
  }

  // ── Repayment tracking ────────────────────────────────────────

  static async loadRepayments() {
    const raw = await AsyncStorage.getItem(REPAYMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  static async addRepayment(repayment) {
    const all = await this.loadRepayments();
    repayment.id = `rep_${Date.now()}`;
    repayment.createdAt = new Date().toISOString();
    repayment.paid = false;
    all.push(repayment);
    await AsyncStorage.setItem(REPAYMENTS_KEY, JSON.stringify(all));
    return repayment.id;
  }

  static async markRepaymentPaid(id) {
    const all = await this.loadRepayments();
    const rep = all.find(r => r.id === id);
    if (rep) { rep.paid = true; rep.paidAt = new Date().toISOString(); }
    await AsyncStorage.setItem(REPAYMENTS_KEY, JSON.stringify(all));
  }

  /**
   * Get repayments due within the next N days.
   */
  static async getDueRepayments(days = 7) {
    const all = await this.loadRepayments();
    const cutoff = new Date(Date.now() + days * 86400000);
    return all.filter(r => !r.paid && new Date(r.dueDate) <= cutoff);
  }

  // ── Income stream classification ─────────────────────────────

  /**
   * Given a credit transaction and user profile,
   * auto-classify the income type and ask user for confirmation
   * if ambiguous.
   */
  static classifyIncomeTxn(txn, profile) {
    const lower = (txn.rawSMSText || '').toLowerCase();
    const from = (txn.from || '').toLowerCase();

    // Salary detection
    if (txn.isSalaryCredit) return { creditType: 'salary', confidence: 0.95, needsConfirm: false };

    // Amazon Pay reward (if user has this income stream)
    if (profile.incomeStreams?.includes('rewards') && txn.sourceApp === 'Amazon Pay') {
      return { creditType: 'reward', confidence: 0.9, needsConfirm: true,
        message: `₹${txn.amount} Amazon Pay credit — is this a work reward or a refund/cashback?` };
    }

    // Check against known senders (parents, siblings)
    if (profile.knownContacts) {
      for (const contact of profile.knownContacts) {
        if (from.includes(contact.name.toLowerCase())) {
          return { creditType: contact.type, confidence: 0.85, needsConfirm: false };
        }
      }
    }

    // Family (if user mentioned sending to parents)
    if (profile.sendSomeone !== 'no') {
      // Can't be sure from name alone — ask user
      return { creditType: 'transfer_in', confidence: 0.5, needsConfirm: true };
    }

    return { creditType: 'transfer_in', confidence: 0.5, needsConfirm: true };
  }

  // ── Helpers ──────────────────────────────────────────────────

  static monthLabel(date) {
    return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }

  static monthName(date) {
    return date.toLocaleDateString('en-IN', { month: 'short' });
  }
}
