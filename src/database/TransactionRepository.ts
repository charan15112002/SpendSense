/**
 * Transaction CRUD Operations (Lock IDs: M1, M2, M10)
 *
 * All read operations for spend totals exclude:
 *   - Failed/reversed/pending/disputed/expired transactions (M2)
 *   - Self-transfers (M2)
 *   - Credit card bill payments (M2)
 *   - Quarantined transactions (M10)
 */

import {getDatabase} from './connection';
import type {
  Transaction,
  TransactionStatus,
  TransactionFlow,
  EconomicType,
  PaymentInstrument,
  LiabilityEffect,
  ConfidenceLevel,
} from '../models/Transaction';
import {SPENDING_ECONOMIC_TYPES, SPEND_ELIGIBLE_STATUSES} from '../models/Transaction';

function generateId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function now(): string {
  return new Date().toISOString();
}

export type CreateTransactionInput = Omit<Transaction, 'id' | 'created_at' | 'updated_at'>;

function rowToTransaction(row: any): Transaction {
  return {
    id: row.id,
    amount: row.amount,
    merchant: row.merchant,
    timestamp: row.timestamp,
    status: row.status as TransactionStatus,
    flow: row.flow as TransactionFlow,
    economic_type: row.economic_type as EconomicType,
    payment_instrument: row.payment_instrument as PaymentInstrument,
    liability_effect: row.liability_effect as LiabilityEffect,
    confidence: row.confidence as ConfidenceLevel,
    source_app: row.source_app,
    raw_text: row.raw_text,
    trust_score: row.trust_score,
    detection_source: row.detection_source,
    is_quarantined: row.is_quarantined === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// CREATE
export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const db = await getDatabase();
  const id = generateId();
  const timestamp_now = now();

  const tx: Transaction = {
    ...input,
    id,
    created_at: timestamp_now,
    updated_at: timestamp_now,
  };

  await db.executeSql(
    `INSERT INTO transactions (
      id, amount, merchant, timestamp,
      status, flow, economic_type, payment_instrument, liability_effect, confidence,
      source_app, raw_text, trust_score, detection_source,
      is_quarantined, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tx.id, tx.amount, tx.merchant, tx.timestamp,
      tx.status, tx.flow, tx.economic_type, tx.payment_instrument,
      tx.liability_effect, tx.confidence,
      tx.source_app, tx.raw_text, tx.trust_score, tx.detection_source,
      tx.is_quarantined ? 1 : 0, tx.created_at, tx.updated_at,
    ],
  );

  return tx;
}

// READ — single transaction
export async function getTransactionById(id: string): Promise<Transaction | null> {
  const db = await getDatabase();
  const [result] = await db.executeSql(
    'SELECT * FROM transactions WHERE id = ?',
    [id],
  );
  if (result.rows.length === 0) {
    return null;
  }
  return rowToTransaction(result.rows.item(0));
}

// READ — all transactions (ordered by timestamp descending)
export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await getDatabase();
  const [result] = await db.executeSql(
    'SELECT * FROM transactions ORDER BY timestamp DESC',
  );
  const transactions: Transaction[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    transactions.push(rowToTransaction(result.rows.item(i)));
  }
  return transactions;
}

// UPDATE
export async function updateTransaction(
  id: string,
  updates: Partial<Omit<Transaction, 'id' | 'created_at'>>,
): Promise<Transaction | null> {
  const existing = await getTransactionById(id);
  if (!existing) {
    return null;
  }

  const updated = {
    ...existing,
    ...updates,
    updated_at: now(),
  };

  const db = await getDatabase();
  await db.executeSql(
    `UPDATE transactions SET
      amount = ?, merchant = ?, timestamp = ?,
      status = ?, flow = ?, economic_type = ?, payment_instrument = ?,
      liability_effect = ?, confidence = ?,
      source_app = ?, raw_text = ?, trust_score = ?, detection_source = ?,
      is_quarantined = ?, updated_at = ?
    WHERE id = ?`,
    [
      updated.amount, updated.merchant, updated.timestamp,
      updated.status, updated.flow, updated.economic_type,
      updated.payment_instrument, updated.liability_effect, updated.confidence,
      updated.source_app, updated.raw_text, updated.trust_score,
      updated.detection_source, updated.is_quarantined ? 1 : 0,
      updated.updated_at, id,
    ],
  );

  return updated;
}

// DELETE
export async function deleteTransaction(id: string): Promise<boolean> {
  const db = await getDatabase();
  const [result] = await db.executeSql(
    'DELETE FROM transactions WHERE id = ?',
    [id],
  );
  return result.rowsAffected > 0;
}

/**
 * SPEND SUM QUERY (Lock IDs: M2, M10)
 *
 * Rules enforced:
 *   - Only status = 'success' (failed/reversed/pending/disputed/expired excluded)
 *   - Only spending economic types (self_transfer, credit_card_payment, etc. excluded)
 *   - Quarantined transactions NEVER enter spend totals
 *
 * Optional date range filter.
 */
export async function getSpendTotal(
  startDate?: string,
  endDate?: string,
): Promise<number> {
  const db = await getDatabase();

  const spendTypes = Array.from(SPENDING_ECONOMIC_TYPES);
  const eligibleStatuses = Array.from(SPEND_ELIGIBLE_STATUSES);

  const placeholdersTypes = spendTypes.map(() => '?').join(',');
  const placeholdersStatuses = eligibleStatuses.map(() => '?').join(',');

  let query = `
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE is_quarantined = 0
      AND status IN (${placeholdersStatuses})
      AND economic_type IN (${placeholdersTypes})
  `;

  const params: any[] = [...eligibleStatuses, ...spendTypes];

  if (startDate) {
    query += ' AND timestamp >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND timestamp <= ?';
    params.push(endDate);
  }

  const [result] = await db.executeSql(query, params);
  return result.rows.item(0).total;
}

/**
 * Get quarantined transactions (for review UI — M10)
 */
export async function getQuarantinedTransactions(): Promise<Transaction[]> {
  const db = await getDatabase();
  const [result] = await db.executeSql(
    'SELECT * FROM transactions WHERE is_quarantined = 1 ORDER BY timestamp DESC',
  );
  const transactions: Transaction[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    transactions.push(rowToTransaction(result.rows.item(i)));
  }
  return transactions;
}
