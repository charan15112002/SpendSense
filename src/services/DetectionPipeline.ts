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
import {logTimelineEvent, logDiscardEvent, logDecision} from './DiagnosticLogger';
import type {Transaction, ConfidenceLevel} from '../models/Transaction';

// Basic dedup: track recent transactions to prevent obvious double-inserts
// M2 scope only — full fingerprint/corroboration system is M3
const recentTransactions: Array<{amount: number; timestamp: number; source: string}> = [];
const DEDUP_WINDOW_MS = 30 * 60 * 1000; // 30 minutes (Section 6 System 1 step 5)
const DEDUP_AMOUNT_TOLERANCE = 1; // ±₹1

function isDuplicate(amount: number, timestamp: number, source: string): boolean {
  const now = Date.now();
  while (recentTransactions.length > 0 && now - recentTransactions[0].timestamp > DEDUP_WINDOW_MS) {
    recentTransactions.shift();
  }

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

function trustToConfidence(trustScore: number): ConfidenceLevel {
  if (trustScore >= 95) return 'auto_high';
  if (trustScore >= 80) return 'auto_medium';
  if (trustScore >= 50) return 'suggested';
  return 'uncertain';
}

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
  // Log: source received (with raw text for whitelisted finance sources — Bug 2 fix)
  await logTimelineEvent({
    event: 'notification_received',
    source: 'notification',
    package_or_sender: packageName,
    detail: {timestamp},
    raw_text: rawText, // Raw text logged for ALL notifications in Mode B for debugging
  });

  // Step 2: FILTER — non-whitelisted packages discarded immediately
  if (!isPackageWhitelisted(packageName, whitelist)) {
    await logDiscardEvent({source: 'notification', package_or_sender: packageName, reason: 'not_whitelisted'});
    return null;
  }

  await logTimelineEvent({event: 'filter_passed', source: 'notification', package_or_sender: packageName});

  // Step 3-4: PARSE + VALIDATE
  const parsed = parseNotificationText(rawText, packageName, templates);

  updateParserHealth(packageName, parsed !== null);

  if (!parsed) {
    await logDiscardEvent({source: 'notification', package_or_sender: packageName, reason: 'parse_failed_no_amount'});
    await logDecision({function_name: 'parseNotificationText', inputs: {packageName, rawText}, output: {result: null}, exclusion_reason: 'no_amount_extracted'});
    return null;
  }

  await logTimelineEvent({
    event: 'parse_success',
    source: 'notification',
    package_or_sender: packageName,
    detail: {amount: parsed.amount, merchant: parsed.merchant, status: parsed.status, flow: parsed.flow, templateMatchLevel: parsed.templateMatchLevel},
  });

  // Step 5: DEDUP
  if (isDuplicate(parsed.amount, timestamp, 'notification')) {
    await logTimelineEvent({event: 'dedup_discarded', source: 'notification', package_or_sender: packageName, detail: {amount: parsed.amount}});
    return null;
  }

  // Step 6: SCORE
  const senderType = getSenderType(packageName, whitelist);
  const templateLevel: TemplateMatchLevel = parsed.templateMatchLevel === 'exact'
    ? 'exact' : parsed.templateMatchLevel === 'partial'
    ? 'partial' : parsed.templateMatchLevel === 'has_amount_merchant'
    ? 'has_amount_merchant' : 'unstructured';

  const proofLevel: TransactionProofLevel = parsed.hasUpiRef
    ? 'upi_reference' : parsed.hasTransactionId
    ? 'transaction_id' : parsed.hasAccountHint
    ? 'account_hint' : 'no_reference';

  const signals: TrustSignals = {
    sender_trust: getSenderTrust(senderType),
    template_match: getTemplateMatch(templateLevel),
    transaction_proof: getTransactionProof(proofLevel),
    corroboration: getCorroboration('single_source'),
    ai_confidence: getAiConfidence('not_configured'),
    historical_pattern: getHistoricalPattern('completely_new'),
  };

  const trustResult = computeTrustScore(signals);

  await logDecision({
    function_name: 'computeTrustScore',
    inputs: {signals},
    output: {score: trustResult.score, behavior: trustResult.behavior},
    score: trustResult.score,
  });

  const txInput: CreateTransactionInput = {
    amount: parsed.amount,
    merchant: parsed.merchant,
    timestamp: new Date(timestamp).toISOString(),
    status: parsed.status,
    flow: parsed.flow,
    economic_type: 'unclassified',
    payment_instrument: 'upi',
    liability_effect: 'none',
    confidence: trustToConfidence(trustResult.score),
    source_app: packageName,
    raw_text: rawText,
    trust_score: trustResult.score,
    detection_source: 'notification',
    is_quarantined: false,
  };

  const gatedInput = applyQuarantineGate(txInput, trustResult);

  await logDecision({
    function_name: 'applyQuarantineGate',
    inputs: {trust_score: trustResult.score},
    output: {is_quarantined: gatedInput.is_quarantined},
    score: trustResult.score,
    exclusion_reason: gatedInput.is_quarantined ? 'trust_below_threshold' : undefined,
  });

  const result = await createTransaction(gatedInput);

  await logTimelineEvent({
    event: 'transaction_stored',
    source: 'notification',
    package_or_sender: packageName,
    detail: {
      amount: gatedInput.amount,
      trust_score: gatedInput.trust_score,
      is_quarantined: gatedInput.is_quarantined,
      confidence: gatedInput.confidence,
      transaction_id: result?.id,
    },
  });

  return result;
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
  await logTimelineEvent({event: 'sms_received', source: 'sms', package_or_sender: sender, detail: {timestamp}, raw_text: rawText});

  const senderInfo = isSenderKnown(sender, shortcodeDB);

  if (!senderInfo.known) {
    if (!hasFinancialKeywords(rawText)) {
      await logDiscardEvent({source: 'sms', package_or_sender: sender, reason: 'unknown_sender_no_financial_keywords'});
      return null;
    }
  }

  await logTimelineEvent({event: 'filter_passed', source: 'sms', package_or_sender: sender, detail: {bank: senderInfo.bankName}});

  const parsed = parseSmsText(rawText, sender, templates, shortcodeDB);

  const bankName = senderInfo.bankName || sender;
  updateParserHealth(bankName, parsed !== null);

  if (!parsed) {
    await logDiscardEvent({source: 'sms', package_or_sender: sender, reason: 'parse_failed_no_amount'});
    await logDecision({function_name: 'parseSmsText', inputs: {sender, rawText}, output: {result: null}, exclusion_reason: 'no_amount_extracted'});
    return null;
  }

  await logTimelineEvent({
    event: 'parse_success',
    source: 'sms',
    package_or_sender: sender,
    detail: {amount: parsed.amount, merchant: parsed.merchant, status: parsed.status, flow: parsed.flow},
  });

  if (parsed.containsPhishingPhrase) {
    await logDiscardEvent({source: 'sms', package_or_sender: sender, reason: 'phishing_phrase_detected'});
    return null;
  }

  if (isDuplicate(parsed.amount, timestamp, 'sms')) {
    await logTimelineEvent({event: 'dedup_discarded', source: 'sms', package_or_sender: sender, detail: {amount: parsed.amount}});
    return null;
  }

  const smsLinkTrustOverride = parsed.containsLink ? 0 : null;

  const senderTrustType: SenderType = senderInfo.known
    ? (senderInfo.senderTrust === 25 ? 'bank_sms_shortcode' : 'bank_sms_regular')
    : 'unknown_sms_sender';

  const templateLevel: TemplateMatchLevel = parsed.templateMatchLevel === 'exact'
    ? 'exact' : parsed.templateMatchLevel === 'partial'
    ? 'partial' : parsed.templateMatchLevel === 'has_amount_merchant'
    ? 'has_amount_merchant' : 'unstructured';

  const proofLevel: TransactionProofLevel = parsed.hasUpiRef
    ? 'upi_reference' : parsed.hasTransactionId
    ? 'transaction_id' : parsed.hasAccountHint
    ? 'account_hint' : 'no_reference';

  const signals: TrustSignals = {
    sender_trust: getSenderTrust(senderTrustType),
    template_match: getTemplateMatch(templateLevel),
    transaction_proof: getTransactionProof(proofLevel),
    corroboration: getCorroboration('single_source'),
    ai_confidence: getAiConfidence('not_configured'),
    historical_pattern: getHistoricalPattern('completely_new'),
  };

  let trustResult = computeTrustScore(signals);

  await logDecision({
    function_name: 'computeTrustScore',
    inputs: {signals, source: 'sms'},
    output: {score: trustResult.score, behavior: trustResult.behavior},
    score: trustResult.score,
  });

  if (smsLinkTrustOverride !== null) {
    await logDecision({
      function_name: 'smsLinkTrustOverride',
      inputs: {original_score: trustResult.score, containsLink: true},
      output: {score: 0, behavior: 'warn_user'},
      score: 0,
      exclusion_reason: 'sms_contains_link',
    });
    trustResult = {...trustResult, score: 0, behavior: 'warn_user'};
  }

  const txInput: CreateTransactionInput = {
    amount: parsed.amount,
    merchant: parsed.merchant,
    timestamp: new Date(timestamp).toISOString(),
    status: parsed.status,
    flow: parsed.flow,
    economic_type: 'unclassified',
    payment_instrument: 'upi',
    liability_effect: 'none',
    confidence: trustToConfidence(trustResult.score),
    source_app: sender,
    raw_text: rawText,
    trust_score: trustResult.score,
    detection_source: 'sms',
    is_quarantined: false,
  };

  const gatedInput = applyQuarantineGate(txInput, trustResult);

  await logDecision({
    function_name: 'applyQuarantineGate',
    inputs: {trust_score: trustResult.score, source: 'sms'},
    output: {is_quarantined: gatedInput.is_quarantined},
    score: trustResult.score,
    exclusion_reason: gatedInput.is_quarantined ? 'trust_below_threshold' : undefined,
  });

  const result = await createTransaction(gatedInput);

  await logTimelineEvent({
    event: 'transaction_stored',
    source: 'sms',
    package_or_sender: sender,
    detail: {
      amount: gatedInput.amount,
      trust_score: gatedInput.trust_score,
      is_quarantined: gatedInput.is_quarantined,
      confidence: gatedInput.confidence,
      transaction_id: result?.id,
    },
  });

  return result;
}
