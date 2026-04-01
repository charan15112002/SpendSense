/**
 * Notification/SMS Parser (Lock IDs: S4-M1, S4-M2, Section 6 System 1, Section 7 C2)
 *
 * Handles steps 2-4 of both pipelines:
 *   2. FILTER: Package whitelist / shortcode DB
 *   3. PARSE: Template matching + generic fallback
 *   4. VALIDATE: Amount required; merchant optional
 *
 * Section 4 D2: Status detection from keywords (failure takes priority over success).
 * Section 7 C2: Template library as updatable JSON config.
 * Section 7 C2 mitigation #3: Generic fallback for unknown templates.
 */

import type {TransactionStatus, TransactionFlow} from '../models/Transaction';

// Loaded from JSON config files (android/app/src/main/assets/)
export interface PackageWhitelist {
  packages: Record<string, {name: string; type: string; sender_trust: number}>;
  explicitly_excluded: Record<string, string>;
}

export interface TemplateConfig {
  templates: Record<string, TemplateEntry[]>;
  generic_fallback: {amount_pattern: string; merchant_pattern: string};
  status_keywords: Record<string, string[]>;
}

export interface TemplateEntry {
  name: string;
  pattern: string;
  extract: {amount: number; merchant?: number};
  flow: string;
}

export interface ShortcodeDB {
  shortcodes: Record<string, {senders: string[]; type: string; sender_trust: number}>;
  phishing_phrases: string[];
}

export interface ParsedTransaction {
  amount: number;
  merchant: string | null;
  flow: TransactionFlow;
  status: TransactionStatus;
  templateName: string | null;   // Which template matched (null = generic fallback)
  templateMatchLevel: 'exact' | 'partial' | 'has_amount_merchant' | 'unstructured';
  hasUpiRef: boolean;
  hasTransactionId: boolean;
  hasAccountHint: boolean;
  containsLink: boolean;         // SMS-specific: Layer 4 phishing check
  containsPhishingPhrase: boolean;
}

/**
 * FILTER: Check if a notification package is in the whitelist.
 * Section 6 System 1 step 2: No match → discard immediately, nothing stored.
 * Section 6 System 9 Layer 1: Non-whitelisted = discarded.
 */
export function isPackageWhitelisted(
  packageName: string,
  whitelist: PackageWhitelist,
): boolean {
  // Explicitly excluded packages (e.g., Gmail — Section 7 C6)
  if (packageName in whitelist.explicitly_excluded) {
    return false;
  }
  return packageName in whitelist.packages;
}

/**
 * FILTER: Check if an SMS sender matches known bank shortcodes.
 * Section 6 System 1 Sideload Pipeline step 2.
 */
export function isSenderKnown(
  sender: string,
  shortcodeDB: ShortcodeDB,
): {known: boolean; bankName: string | null; senderTrust: number} {
  const normalizedSender = sender.toUpperCase().replace(/[^A-Z0-9]/g, '');

  for (const [bankName, config] of Object.entries(shortcodeDB.shortcodes)) {
    for (const code of config.senders) {
      if (normalizedSender.includes(code.toUpperCase())) {
        return {known: true, bankName, senderTrust: config.sender_trust};
      }
    }
  }

  return {known: false, bankName: null, senderTrust: 0};
}

/**
 * Check for financial keywords as secondary filter (Section 6 System 1 Sideload step 2).
 */
export function hasFinancialKeywords(text: string): boolean {
  const keywords = [
    'debited', 'credited', 'transferred', 'received', 'paid',
    'upi', 'neft', 'imps', 'rtgs', 'a/c', 'account',
    'transaction', 'txn', 'rupee', 'inr',
  ];
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

/**
 * PARSE: Apply bank/app-specific template, then generic fallback.
 * Section 6 System 1 steps 3-4.
 * Section 4 D2: Status detection with failure-takes-priority rule.
 */
export function parseNotificationText(
  rawText: string,
  packageName: string,
  templates: TemplateConfig,
): ParsedTransaction | null {
  const status = detectStatus(rawText, templates.status_keywords);
  const flow = detectFlow(rawText);

  // Try bank/app-specific templates first
  const packageTemplates = templates.templates[packageName];
  if (packageTemplates) {
    for (const template of packageTemplates) {
      const regex = new RegExp(template.pattern, 'i');
      const match = rawText.match(regex);
      if (match) {
        const amountStr = match[template.extract.amount];
        const amount = parseAmount(amountStr);
        if (amount === null || amount <= 0) continue;

        const merchant = template.extract.merchant
          ? (match[template.extract.merchant] || null)
          : null;

        return {
          amount,
          merchant: merchant ? merchant.trim() : null,
          flow: (template.flow as TransactionFlow) || flow,
          status,
          templateName: template.name,
          templateMatchLevel: 'exact',
          hasUpiRef: hasUpiReference(rawText),
          hasTransactionId: hasTransactionIdRef(rawText),
          hasAccountHint: hasAccountHintRef(rawText),
          containsLink: containsUrl(rawText),
          containsPhishingPhrase: false,
        };
      }
    }
  }

  // Generic fallback (Section 7 C2 mitigation #3)
  const genericResult = parseGenericFallback(rawText, templates.generic_fallback);
  if (genericResult) {
    return {
      ...genericResult,
      flow,
      status,
      templateName: null,
      templateMatchLevel: genericResult.merchant ? 'has_amount_merchant' : 'unstructured',
      hasUpiRef: hasUpiReference(rawText),
      hasTransactionId: hasTransactionIdRef(rawText),
      hasAccountHint: hasAccountHintRef(rawText),
      containsLink: containsUrl(rawText),
      containsPhishingPhrase: false,
    };
  }

  // No amount extractable → discard (Section 6 System 1 step 4: amount is required)
  return null;
}

/**
 * PARSE SMS: Same as notification but also checks for phishing (Section 6 System 9 Layer 4).
 */
export function parseSmsText(
  rawText: string,
  sender: string,
  templates: TemplateConfig,
  shortcodeDB: ShortcodeDB,
): ParsedTransaction | null {
  // Layer 4: Link detection — SMS with ANY URL → trust = 0, flagged as phishing
  const hasLink = containsUrl(rawText);

  // Layer 4: Phishing phrase detection
  const hasPhishing = containsPhishingPhrase(rawText, shortcodeDB.phishing_phrases);

  // Use sender as a pseudo package name for template matching
  // For SMS, we match by iterating all templates (SMS doesn't have package names)
  const status = detectStatus(rawText, templates.status_keywords);
  const flow = detectFlow(rawText);

  // Try all templates (SMS can come from any bank)
  for (const [_pkg, pkgTemplates] of Object.entries(templates.templates)) {
    for (const template of pkgTemplates) {
      const regex = new RegExp(template.pattern, 'i');
      const match = rawText.match(regex);
      if (match) {
        const amountStr = match[template.extract.amount];
        const amount = parseAmount(amountStr);
        if (amount === null || amount <= 0) continue;

        const merchant = template.extract.merchant
          ? (match[template.extract.merchant] || null)
          : null;

        return {
          amount,
          merchant: merchant ? merchant.trim() : null,
          flow: (template.flow as TransactionFlow) || flow,
          status,
          templateName: template.name,
          templateMatchLevel: 'exact',
          hasUpiRef: hasUpiReference(rawText),
          hasTransactionId: hasTransactionIdRef(rawText),
          hasAccountHint: hasAccountHintRef(rawText),
          containsLink: hasLink,
          containsPhishingPhrase: hasPhishing,
        };
      }
    }
  }

  // Generic fallback
  const genericResult = parseGenericFallback(rawText, templates.generic_fallback);
  if (genericResult) {
    return {
      ...genericResult,
      flow,
      status,
      templateName: null,
      templateMatchLevel: genericResult.merchant ? 'has_amount_merchant' : 'unstructured',
      hasUpiRef: hasUpiReference(rawText),
      hasTransactionId: hasTransactionIdRef(rawText),
      hasAccountHint: hasAccountHintRef(rawText),
      containsLink: hasLink,
      containsPhishingPhrase: hasPhishing,
    };
  }

  return null;
}

// --- Helpers ---

function parseAmount(str: string): number | null {
  if (!str) return null;
  const cleaned = str.replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Status detection (Section 4 D2).
 * Rule: If both failure and success keywords present, failure takes priority.
 */
function detectStatus(
  text: string,
  keywords: Record<string, string[]>,
): TransactionStatus {
  const lower = text.toLowerCase();

  // Check failure keywords first (takes priority)
  const failureStatuses: TransactionStatus[] = [
    'failed', 'pending', 'reversed', 'refunded', 'disputed', 'expired',
  ];

  for (const status of failureStatuses) {
    const statusKeywords = keywords[status];
    if (statusKeywords && statusKeywords.some(kw => lower.includes(kw))) {
      return status;
    }
  }

  // Check success keywords
  const successKeywords = keywords['success'];
  if (successKeywords && successKeywords.some(kw => lower.includes(kw))) {
    return 'success';
  }

  // Default to success if no keywords matched (notification implies transaction happened)
  return 'success';
}

function detectFlow(text: string): TransactionFlow {
  const lower = text.toLowerCase();
  if (lower.includes('credited') || lower.includes('received') || lower.includes('deposited')) {
    return 'inflow';
  }
  if (lower.includes('debited') || lower.includes('paid') || lower.includes('sent') || lower.includes('withdrawn')) {
    return 'outflow';
  }
  return 'outflow'; // Default assumption for payment notifications
}

function hasUpiReference(text: string): boolean {
  return /\b\d{12}\b/.test(text) || /upi\s*ref/i.test(text);
}

function hasTransactionIdRef(text: string): boolean {
  return /txn\s*(?:id|no|#)/i.test(text) || /transaction\s*(?:id|no|#)/i.test(text);
}

function hasAccountHintRef(text: string): boolean {
  return /(?:a\/c|account|acct)\s*(?:xx|\*+)\s*\d+/i.test(text);
}

function containsUrl(text: string): boolean {
  return /https?:\/\/|www\.|\.com\/|\.in\/|bit\.ly|goo\.gl/i.test(text);
}

function containsPhishingPhrase(text: string, phrases: string[]): boolean {
  const lower = text.toLowerCase();
  return phrases.some(phrase => lower.includes(phrase.toLowerCase()));
}

function parseGenericFallback(
  text: string,
  fallback: {amount_pattern: string; merchant_pattern: string},
): {amount: number; merchant: string | null} | null {
  const amountRegex = new RegExp(fallback.amount_pattern, 'i');
  const amountMatch = text.match(amountRegex);
  if (!amountMatch) return null;

  const amount = parseAmount(amountMatch[1]);
  if (amount === null || amount <= 0) return null;

  const merchantRegex = new RegExp(fallback.merchant_pattern, 'i');
  const merchantMatch = text.match(merchantRegex);
  const merchant = merchantMatch ? merchantMatch[1].trim() : null;

  return {amount, merchant};
}
