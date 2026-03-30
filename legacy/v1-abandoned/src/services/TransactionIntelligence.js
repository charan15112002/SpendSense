import {Database} from './Database';
import {AIService} from './AIService';

const LIVE_PROMPT_WINDOW_HOURS = 36;

function getAgeInHours(timestamp) {
  const value = new Date(timestamp).getTime();
  if (Number.isNaN(value)) {
    return Number.MAX_SAFE_INTEGER;
  }

  return Math.abs(Date.now() - value) / (1000 * 60 * 60);
}

function getVpa(text = '') {
  return (
    text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)/)?.[1]?.toLowerCase() || null
  );
}

export class TransactionIntelligence {
  static getPatternKey(txn) {
    const rawText =
      txn.rawSMS || txn.rawNotificationText || txn.rawSMSText || '';
    const vpa = getVpa(rawText);
    if (vpa) {
      return `vpa:${vpa}`;
    }

    if (txn.merchant && txn.merchant !== 'Unknown') {
      return `merchant:${txn.merchant
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 24)}`;
    }

    return `amount:${Math.round((txn.amount || 0) / 10) * 10}`;
  }

  static shouldPromptUser(txn, {historical = false} = {}) {
    if (historical || txn.flow !== 'debit' || txn.autoClassified) {
      return false;
    }

    return getAgeInHours(txn.timestamp) <= LIVE_PROMPT_WINDOW_HOURS;
  }

  static async enrichTransaction(txn, {historical = false} = {}) {
    const enriched = {
      ...txn,
      needsUserReview: false,
      needsUserNote: false,
      confidenceScore: txn.aiConfidence ?? txn.parserConfidence ?? null,
      reviewGroupKey: this.getPatternKey(txn),
      parserVersion: 'v4',
    };

    const learnedPattern = await Database.getPattern(enriched.reviewGroupKey);
    if (learnedPattern?.category) {
      enriched.suggestedCategory = learnedPattern.category;
      if (!enriched.category || enriched.category === 'misc') {
        enriched.category = learnedPattern.category;
      }
    }

    if (learnedPattern?.auto_classify) {
      enriched.category = learnedPattern.category;
      enriched.status = 'confirmed';
      enriched.autoClassified = true;
      enriched.confidenceScore = Math.max(enriched.confidenceScore || 0, 0.95);
      return enriched;
    }

    const shouldUseAI =
      (await AIService.hasApiKey()) &&
      !historical &&
      enriched.flow === 'debit' &&
      (!enriched.category ||
        enriched.category === 'misc' ||
        enriched.merchant === 'Unknown' ||
        (enriched.parserConfidence || 0) < 0.78);

    if (shouldUseAI) {
      const aiDecision = await AIService.reviewTransactionMessage(enriched);
      if (aiDecision && aiDecision.shouldTrack === false) {
        return null;
      }

      if (aiDecision?.merchant && enriched.merchant === 'Unknown') {
        enriched.merchant = aiDecision.merchant;
      }

      if (aiDecision?.category) {
        enriched.suggestedCategory = aiDecision.category;
        if (!enriched.category || enriched.category === 'misc') {
          enriched.category = aiDecision.category;
        }
      }

      if (typeof aiDecision?.confidence === 'number') {
        enriched.aiConfidence = aiDecision.confidence;
        enriched.confidenceScore = aiDecision.confidence;
      }

      if (aiDecision?.reason) {
        enriched.classifierReason = aiDecision.reason;
      }
    }

    if (enriched.flow !== 'debit') {
      enriched.status = 'confirmed';
      return enriched;
    }

    if (historical) {
      enriched.status =
        enriched.category && enriched.category !== 'misc'
          ? 'confirmed'
          : 'review';
      enriched.needsUserReview = enriched.status === 'review';
      return enriched;
    }

    if (this.shouldPromptUser(enriched, {historical})) {
      enriched.status = 'pending';
      enriched.needsUserNote = true;
      enriched.needsUserReview = true;
      return enriched;
    }

    enriched.status = 'review';
    enriched.needsUserReview = true;
    return enriched;
  }
}
