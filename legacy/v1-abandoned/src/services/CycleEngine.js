/**
 * CycleEngine.js
 * 
 * Handles all financial cycle logic:
 * - Mid-cycle install detection
 * - Cycle boundary calculation
 * - Time period helpers (week, 3 months, day-by-day)
 * - Partial cycle awareness
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from './Database';

const INSTALL_DATE_KEY = 'spendsense_install_date';
const PROFILE_KEY = 'spendsense_profile';

export class CycleEngine {

  // ── Install date tracking ─────────────────────────────────────

  static async getInstallDate() {
    const stored = await AsyncStorage.getItem(INSTALL_DATE_KEY);
    if (stored) return new Date(stored);
    // First time — save today as install date
    const today = new Date();
    await AsyncStorage.setItem(INSTALL_DATE_KEY, today.toISOString());
    return today;
  }

  // ── Core cycle calculation ────────────────────────────────────

  /**
   * Get full context for the current moment:
   * - which cycle we're in
   * - whether it's partial (installed mid-cycle)
   * - how many days of data we actually have
   * - labels for UI display
   */
  static async getCycleContext() {
    const installDate = await this.getInstallDate();
    const profileRaw = await AsyncStorage.getItem(PROFILE_KEY);
    const profile = profileRaw ? JSON.parse(profileRaw) : { cycleDay: 26 };
    const cycleDay = profile.cycleDay || 26;

    const today = new Date();
    const currentCycle = this.getCycleBoundary(today, cycleDay);
    const syncState = await Database.loadSyncState();
    const trackingWindowDays = Number(profile.trackingWindowDays) || 365;
    const cycleLength = Math.floor((currentCycle.end - currentCycle.start) / 86400000) + 1;
    const fullCycleBackfillAvailable =
      Boolean(syncState?.lastFullScanAt) && trackingWindowDays >= cycleLength;
    const isPartial = installDate > currentCycle.start && !fullCycleBackfillAvailable;
    const trackingStart = isPartial ? installDate : currentCycle.start;
    const daysTracked = Math.floor((today - trackingStart) / 86400000) + 1;
    const totalCycleDays = Math.floor((currentCycle.end - currentCycle.start) / 86400000) + 1;
    const daysRemaining = Math.floor((currentCycle.end - today) / 86400000);

    return {
      cycleDay,
      installDate,
      trackingStart,
      currentCycle,
      isPartial,
      daysTracked,
      totalCycleDays,
      daysRemaining,
      partialBannerText: isPartial
        ? `Tracking since ${this.formatDate(installDate)} · ${daysTracked} of ${totalCycleDays} days`
        : null,
      cycleLabel: this.getCycleLabel(currentCycle),
    };
  }

  /**
   * Calculate the start and end of the cycle containing a given date.
   * Example: cycleDay=26, date=Mar 20 → Feb 26 – Mar 25
   *          cycleDay=26, date=Mar 27 → Mar 26 – Apr 25
   */
  static getCycleBoundary(date, cycleDay) {
    const d = new Date(date);
    let startMonth, startYear;

    if (d.getDate() >= cycleDay) {
      startMonth = d.getMonth();
      startYear = d.getFullYear();
    } else {
      startMonth = d.getMonth() - 1;
      startYear = d.getFullYear();
      if (startMonth < 0) { startMonth = 11; startYear--; }
    }

    const start = new Date(startYear, startMonth, cycleDay);
    // End = one day before the same cycleDay next month
    const end = new Date(startYear, startMonth + 1, cycleDay - 1);

    return { start, end };
  }

  /**
   * Get the previous N cycles (for history view).
   */
  static getPreviousCycles(count, cycleDay) {
    const cycles = [];
    let date = new Date();

    for (let i = 0; i < count; i++) {
      const cycle = this.getCycleBoundary(date, cycleDay);
      cycles.push(cycle);
      // Move to the day before this cycle started
      date = new Date(cycle.start.getTime() - 86400000);
    }

    return cycles; // [current, previous, 2 back, ...]
  }

  // ── Time period helpers ───────────────────────────────────────

  /**
   * Returns { start, end, label, type } for a given period selection.
   * Types: 'current_cycle' | 'last_cycle' | 'last_3_months' |
   *        'this_week' | 'last_week' | 'today' | 'custom'
   */
  static getPeriod(type, cycleDay = 26) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    switch (type) {
      case 'current_cycle': {
        const c = this.getCycleBoundary(new Date(), cycleDay);
        return { start: c.start, end: today, label: this.getCycleLabel(c), type };
      }
      case 'last_cycle': {
        const prev = new Date(this.getCycleBoundary(new Date(), cycleDay).start.getTime() - 86400000);
        const c = this.getCycleBoundary(prev, cycleDay);
        return { start: c.start, end: c.end, label: `${this.getCycleLabel(c)} (prev)`, type };
      }
      case 'last_3_months': {
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        threeMonthsAgo.setHours(0, 0, 0, 0);
        return { start: threeMonthsAgo, end: today, label: 'Last 3 months', type };
      }
      case 'this_week': {
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
        return { start: weekStart, end: today, label: 'This week', type };
      }
      case 'last_week': {
        const lastWeekEnd = new Date(todayStart);
        lastWeekEnd.setDate(lastWeekEnd.getDate() - lastWeekEnd.getDay());
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekStart.getDate() - 6);
        return { start: lastWeekStart, end: lastWeekEnd, label: 'Last week', type };
      }
      case 'today': {
        return { start: todayStart, end: today, label: 'Today', type };
      }
      default:
        return { start: todayStart, end: today, label: 'Today', type };
    }
  }

  /**
   * Get daily spending data points for a period.
   * Returns array of { date, dateLabel, spent, income, net }
   */
  static getDailyBreakdown(transactions, start, end) {
    const days = [];
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);

    while (current <= end) {
      const dayStart = new Date(current);
      const dayEnd = new Date(current);
      dayEnd.setHours(23, 59, 59, 999);

      const dayTxns = transactions.filter(t => {
        const ts = new Date(t.timestamp || t.ts);
        return ts >= dayStart && ts <= dayEnd;
      });

      const spent  = dayTxns.filter(t => t.flow === 'debit').reduce((s, t) => s + t.amount, 0);
      const income = dayTxns.filter(t => t.flow === 'credit').reduce((s, t) => s + t.amount, 0);

      days.push({
        date: new Date(current),
        dateLabel: current.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        dayLabel: current.toLocaleDateString('en-IN', { weekday: 'short' }),
        spent,
        income,
        net: income - spent,
        count: dayTxns.length,
      });

      current.setDate(current.getDate() + 1);
    }
    return days;
  }

  /**
   * Get weekly summary for a 3-month period.
   * Returns array of { weekLabel, spent, income }
   */
  static getWeeklyBreakdown(transactions, start, end) {
    const weeks = [];
    const current = new Date(start);
    // Align to Monday
    const day = current.getDay();
    current.setDate(current.getDate() - (day === 0 ? 6 : day - 1));
    current.setHours(0, 0, 0, 0);

    while (current <= end) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weekTxns = transactions.filter(t => {
        const ts = new Date(t.timestamp || t.ts);
        return ts >= weekStart && ts <= weekEnd;
      });

      const spent  = weekTxns.filter(t => t.flow === 'debit').reduce((s, t) => s + t.amount, 0);
      const income = weekTxns.filter(t => t.flow === 'credit').reduce((s, t) => s + t.amount, 0);

      weeks.push({
        weekLabel: `${weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
        spent,
        income,
        net: income - spent,
      });

      current.setDate(current.getDate() + 7);
    }
    return weeks;
  }

  // ── Insight generation for partial cycles ─────────────────────

  static getPartialCycleInsights(context, transactions) {
    const insights = [];
    const { isPartial, daysTracked, totalCycleDays, daysRemaining, trackingStart } = context;

    if (isPartial) {
      const pct = Math.round((daysTracked / totalCycleDays) * 100);
      insights.push({
        type: 'info',
        icon: '📅',
        title: `Partial cycle — ${pct}% tracked`,
        text: `SpendSense started tracking on ${this.formatDate(trackingStart)}. ` +
              `Data covers ${daysTracked} of ${totalCycleDays} days this cycle. ` +
              `Averages and budgets will become more accurate over full cycles.`,
      });
    }

    if (daysRemaining <= 5 && daysRemaining >= 0) {
      const totalSpent = transactions.filter(t => t.flow === 'debit').reduce((s, t) => s + t.amount, 0);
      const dailyAvg = daysTracked > 0 ? Math.round(totalSpent / daysTracked) : 0;
      const projectedExtra = dailyAvg * daysRemaining;
      insights.push({
        type: 'warning',
        icon: '⏰',
        title: `${daysRemaining} days left in cycle`,
        text: `At your current pace (₹${dailyAvg.toLocaleString('en-IN')}/day), ` +
              `you'll spend about ₹${projectedExtra.toLocaleString('en-IN')} more before cycle ends.`,
      });
    }

    return insights;
  }

  // ── Helpers ───────────────────────────────────────────────────

  static getCycleLabel(cycle) {
    const s = cycle.start;
    const e = cycle.end;
    return `${s.getDate()} ${s.toLocaleDateString('en-IN', { month: 'short' })} – ` +
           `${e.getDate()} ${e.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}`;
  }

  static formatDate(date) {
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  static isWithinPeriod(timestamp, start, end) {
    const ts = new Date(timestamp);
    return ts >= start && ts <= end;
  }
}
