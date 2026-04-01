/**
 * Detection Pipeline (Lock IDs: S4-M1, S4-M2, S4-M3, Section 6 System 1)
 *
 * Orchestrates the full pipeline:
 *   1. Receive raw data from native bridge
 *   2. Filter (whitelist/shortcode)
 *   3. Parse (templates + generic fallback)
 *   4. Basic dedup (M2 scope — prevent obvious double-inserts only)
 *   5. Score (trust scoring from M1)
 *   6. Quarantine gate (M10)
 *   7. Store (M1 storage layer with full 6-axis model)
 *
 * Classification (M3), identity graph (M4), full dedup (M3 System 14) are OUT OF SCOPE.
 */

import {
  isPackageWhitelisted,
  isSenderKnown,
  hasFinancialKeywords,
  parseNotificationText,
  parseSmsText,
  type PackageWhitelist,
  type TemplateConfig,
  type ShortcodeDB,
  type ParsedTransaction,
} from './NotificationParser';
import {
  computeTrustScore,
  getSenderTrust,
  getTemplateMatch,
  getTransactionProof,
  getCorroboration,
  getAiConfidence,
  getHistoricalPattern,
  type TrustSignals,
  type SenderType,
  type TemplateMatchLevel,
  type TransactionProofLevel,
} from './TrustScoring';
import {applyQuarantineGate} from './QuarantineGate';
import {createTransaction, type CreateTransactionInput} from '../database/TransactionRepository';
import {updateParserHealth} from './ParserHealth';
import type {Transaction, ConfidenceLevel} from '../models/Transaction';

// Basic dedup: track recent transactions to prevent obvious double-inserts
// M2 scope only — full fingerprint/corroboration system is M3
const recentTransactions: Array<{amount: number; timestamp: number; source: string}> = [];
const DEDUP_WINDOW_MS = 30 * 60 * 1000; // 30 minutes (Section 6 System 1 step 5)
const DEDUP_AMOUNT_TOLERANCE = 1; // ±₹1

function isDuplicate(amount: number, timestamp: number, source: string): boolean {
  const now = Date.now();
  // Clean old entries
  while (recentTransactions.length > 0 && now - recentTransactions[0].timestamp > DEDUP_WINDOW_MS) {
    recentTransactions.shift();
  }

  // Check for duplicate: same amount (±₹1) within 30-minute window
  const isDup = recentTransactions.some(
    recent =>
      Math.abs(recent.amount - amount) <= DEDUP_AMOUNT_TOLERANCE &&
      Math.abs(recent.timestamp - timestamp) < DEDUP_WINDOW_MS,
  );

  if (!isDup) {
    recentTransactions.push({amount, timestamp, source});
  }

  return isDup;
}

/**
 * Trust score → confidence level mapping.
 */
function trustToConfidence(trustScore: number): ConfidenceLevel {
  if (trustScore >= 95) return 'auto_high';
  if (trustScore >= 80) return 'auto_medium';
  if (trustScore >= 50) return 'suggested';
  return 'uncertain';
}

/**
 * Determine sender trust type from package info.
 */
function getSenderType(packageName: string, whitelist: PackageWhitelist): SenderType {
  const pkg = whitelist.packages[packageName];
  if (!pkg) return 'unknown_app_notification';
  if (pkg.type === 'bank_app') return 'bank_app_notification';
  if (pkg.type === 'upi_app') return 'upi_app_notification';
  return 'unknown_app_notification';
}

/**
 * Process a notification from the native bridge.
 * Section 6 System 1 Play Store Pipeline (C2).
 */
export async function processNotification(
  packageName: string,
  rawText: string,
  timestamp: number,
  whitelist: PackageWhitelist,
  templates: TemplateConfig,
): Promise<Transaction | null> {
  // Step 2: FILTER — non-whitelisted packages discarded immediately
  if (!isPackageWhitelisted(packageName, whitelist)) {
    return null; // Section 6 System 1 step 2, System 9 Layer 1
  }

  // Step 3-4: PARSE + VALIDATE
  const parsed = parseNotificationText(rawText, packageName, templates);

  // Track parser health (Section 7 C2 mitigation #4)
  updateParserHealth(packageName, parsed !== null);

  if (!parsed) {
    return null; // Amount not extractable → discard
  }

  // Step 5: DEDUP (basic — M2 scope)
  if (isDuplicate(parsed.amount, timestamp, 'notification')) {
    return null;
  }

  // Step 6: SCORE
  const senderType = getSenderType(packageName, whitelist);
  const templateLevel: TemplateMatchLevel = parsed.templateMatchLevel === 'exact'
    ? 'exact'
    : parsed.templateMatchLevel === 'partial'
    ? 'partial'
    : parsed.templateMatchLevel === 'has_amount_merchant'
    ? 'has_amount_merchant'
    : 'unstructured';

  const proofLevel: TransactionProofLevel = parsed.hasUpiRef
    ? 'upi_reference'
    : parsed.hasTransactionId
    ? 'transaction_id'
    : parsed.hasAccountHint
    ? 'account_hint'
    : 'no_reference';

  const signals: TrustSignals = {
    sender_trust: getSenderTrust(senderType),
    template_match: getTemplateMatch(templateLevel),
    transaction_proof: getTransactionProof(proofLevel),
    corroboration: getCorroboration('single_source'),
    ai_confidence: getAiConfidence('not_configured'), // AI is M3/M6
    historical_pattern: getHistoricalPattern('completely_new'), // Pattern memory is M3
  };

  const trustResult = computeTrustScore(signals);

  // Step 7: Build transaction input with 6-axis model (S4-M3)
  const txInput: CreateTransactionInput = {
    amount: parsed.amount,
    merchant: parsed.merchant,
    timestamp: new Date(timestamp).toISOString(),
    status: parsed.status,
    flow: parsed.flow,
    economic_type: 'unclassified', // Classification is M3
    payment_instrument: 'upi',     // Default; refined by M3 classification
    liability_effect: 'none',      // Refined by M3/M4
    confidence: trustToConfidence(trustResult.score),
    source_app: packageName,
    raw_text: rawText,
    trust_score: trustResult.score,
    detection_source: 'notification',
    is_quarantined: false,
  };

  // Step 7b: Quarantine gate (M10)
  const gatedInput = applyQuarantineGate(txInput, trustResult);

  // Step 8: STORE
  return createTransaction(gatedInput);
}

/**
 * Process an SMS from the native bridge.
 * Section 6 System 1 Sideload Pipeline (C3).
 */
export async function processSms(
  sender: string,
  rawText: string,
  timestamp: number,
  whitelist: PackageWhitelist,
  templates: TemplateConfig,
  shortcodeDB: ShortcodeDB,
): Promise<Transaction | null> {
  // Step 2: FILTER — check sender against bank shortcode DB
  const senderInfo = isSenderKnown(sender, shortcodeDB);

  if (!senderInfo.known) {
    // Secondary filter: check for financial keywords
    if (!hasFinancialKeywords(rawText)) {
      return null; // Neither known sender nor financial keywords → discard
    }
  }

  // Step 3-4: PARSE + VALIDATE
  const parsed = parseSmsText(rawText, sender, templates, shortcodeDB);

  // Track parser health
  const bankName = senderInfo.bankName || sender;
  updateParserHealth(bankName, parsed !== null);

  if (!parsed) {
    return null;
  }

  // Layer 4 (Section 6 System 9): SMS with link → trust = 0
  // Layer 4: Phishing phrases → auto-reject
  if (parsed.containsPhishingPhrase) {
    return null; // "click here", "update KYC" etc. → auto-reject, Section 6 System 9 Layer 4
  }

  // Step 5: DEDUP (basic — M2 scope)
  if (isDuplicate(parsed.amount, timestamp, 'sms')) {
    return null;
  }

  // Step 6: SCORE
  const smsLinkTrustOverride = parsed.containsLink ? 0 : null; // Layer 4: links → trust = 0

  const senderTrustType: SenderType = senderInfo.known
    ? (senderInfo.senderTrust === 25 ? 'bank_sms_shortcode' : 'bank_sms_regular')
    : 'unknown_sms_sender';

  const templateLevel: TemplateMatchLevel = parsed.templateMatchLevel === 'exact'
    ? 'exact'
    : parsed.templateMatchLevel === 'partial'
    ? 'partial'
    : parsed.templateMatchLevel === 'has_amount_merchant'
    ? 'has_amount_merchant'
    : 'unstructured';

  const proofLevel: TransactionProofLevel = parsed.hasUpiRef
    ? 'upi_reference'
    : parsed.hasTransactionId
    ? 'transaction_id'
    : parsed.hasAccountHint
    ? 'account_hint'
    : 'no_reference';

  const signals: TrustSignals = {
    sender_trust: getSenderTrust(senderTrustType),
    template_match: getTemplateMatch(templateLevel),
    transaction_proof: getTransactionProof(proofLevel),
    corroboration: getCorroboration('single_source'),
    ai_confidence: getAiConfidence('not_configured'),
    historical_pattern: getHistoricalPattern('completely_new'),
  };

  let trustResult = computeTrustScore(signals);

  // Layer 4 override: SMS with link → force trust = 0
  if (smsLinkTrustOverride !== null) {
    trustResult = {
      ...trustResult,
      score: 0,
      behavior: 'warn_user',
    };
  }

  // Build transaction input (S4-M3: 6-axis model)
  const txInput: CreateTransactionInput = {
    amount: parsed.amount,
    merchant: parsed.merchant,
    timestamp: new Date(timestamp).toISOString(),
    status: parsed.status,
    flow: parsed.flow,
    economic_type: 'unclassified', // Classification is M3
    payment_instrument: 'upi',
    liability_effect: 'none',
    confidence: trustToConfidence(trustResult.score),
    source_app: sender,
    raw_text: rawText,
    trust_score: trustResult.score,
    detection_source: 'sms',
    is_quarantined: false,
  };

  // Quarantine gate (M10)
  const gatedInput = applyQuarantineGate(txInput, trustResult);

  return createTransaction(gatedInput);
}
