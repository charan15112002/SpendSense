/**
 * Parser Health Counter (Lock ID: Section 7 C2 mitigation #4)
 *
 * Per-bank parse success/fail rate over rolling 7-day window.
 * All local counters — no backend analytics, no remote monitoring.
 *
 * Section 7 C2: "if parse success rate for a known bank drops below 50%
 * over 20+ notifications, show Settings note"
 */

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface HealthEntry {
  timestamp: number;
  success: boolean;
}

interface BankHealth {
  entries: HealthEntry[];
}

const healthData: Map<string, BankHealth> = new Map();

/**
 * Record a parse attempt for a bank/package.
 */
export function updateParserHealth(bankOrPackage: string, success: boolean): void {
  let health = healthData.get(bankOrPackage);
  if (!health) {
    health = {entries: []};
    healthData.set(bankOrPackage, health);
  }

  const now = Date.now();

  // Add new entry
  health.entries.push({timestamp: now, success});

  // Prune entries older than 7 days
  health.entries = health.entries.filter(e => now - e.timestamp < SEVEN_DAYS_MS);
}

/**
 * Get parse health stats for a bank/package.
 * Returns success rate and total count for the 7-day window.
 */
export function getParserHealth(
  bankOrPackage: string,
): {successRate: number; totalCount: number; needsAttention: boolean} {
  const health = healthData.get(bankOrPackage);
  if (!health || health.entries.length === 0) {
    return {successRate: 1.0, totalCount: 0, needsAttention: false};
  }

  const now = Date.now();
  const recent = health.entries.filter(e => now - e.timestamp < SEVEN_DAYS_MS);
  const total = recent.length;
  const successes = recent.filter(e => e.success).length;
  const rate = total > 0 ? successes / total : 1.0;

  // Section 7 C2: below 50% over 20+ notifications → needs attention
  const needsAttention = total >= 20 && rate < 0.5;

  return {successRate: rate, totalCount: total, needsAttention};
}

/**
 * Get health stats for all tracked banks/packages.
 */
export function getAllParserHealth(): Array<{
  bankOrPackage: string;
  successRate: number;
  totalCount: number;
  needsAttention: boolean;
}> {
  const results: Array<{
    bankOrPackage: string;
    successRate: number;
    totalCount: number;
    needsAttention: boolean;
  }> = [];

  for (const [key] of healthData) {
    results.push({bankOrPackage: key, ...getParserHealth(key)});
  }

  return results;
}
