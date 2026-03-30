/**
 * DatabaseService.js
 * 
 * Local SQLite database for SpendSense.
 * Uses: react-native-sqlite-storage
 * Install: npm install react-native-sqlite-storage
 * 
 * All data is stored locally on the device.
 * Optional: sync to Firebase (see FirebaseService.js)
 */

import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let db = null;

export class DatabaseService {

  // ── Initialize ────────────────────────────────────
  static async initialize() {
    db = await SQLite.openDatabase({
      name: 'SpendSense.db',
      location: 'default',
    });

    await this.createTables();
    console.log('[Database] Initialized.');
  }

  static async createTables() {
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        amount REAL,
        merchant TEXT,
        sourceApp TEXT,
        category TEXT,
        suggestedCategory TEXT,
        userNote TEXT,
        rawSMSText TEXT,
        rawNotificationText TEXT,
        transactionType TEXT,
        upiRef TEXT,
        account TEXT,
        bank TEXT,
        balance REAL,
        aiConfidence REAL,
        status TEXT DEFAULT 'missingInfo',
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now'))
      )
    `);

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        category TEXT UNIQUE NOT NULL,
        limitAmount REAL NOT NULL,
        used REAL DEFAULT 0,
        resetFrequency TEXT DEFAULT 'monthly',
        createdAt TEXT DEFAULT (datetime('now'))
      )
    `);

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS insights (
        id TEXT PRIMARY KEY,
        generatedDate TEXT,
        insightType TEXT,
        title TEXT,
        explanation TEXT,
        icon TEXT,
        createdAt TEXT DEFAULT (datetime('now'))
      )
    `);

    // Index for fast queries
    await db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_transactions_timestamp
      ON transactions(timestamp DESC)
    `);
    await db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_transactions_category
      ON transactions(category)
    `);
  }

  // ── Transactions ──────────────────────────────────

  static async saveTransaction(txn) {
    const sql = `
      INSERT OR REPLACE INTO transactions
      (id, timestamp, amount, merchant, sourceApp, category, suggestedCategory,
       userNote, rawSMSText, rawNotificationText, transactionType, upiRef,
       account, bank, balance, aiConfidence, status, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;

    await db.executeSql(sql, [
      txn.id,
      txn.timestamp,
      txn.amount,
      txn.merchant,
      txn.sourceApp,
      txn.category,
      txn.suggestedCategory,
      txn.userNote,
      txn.rawSMSText,
      txn.rawNotificationText,
      txn.transactionType,
      txn.upiRef,
      txn.account,
      txn.bank,
      txn.balance,
      txn.aiConfidence,
      txn.status || 'missingInfo',
    ]);

    return txn.id;
  }

  static async updateTransaction(id, updates) {
    const fields = Object.keys(updates)
      .map(k => `${k} = ?`)
      .join(', ');
    const values = [...Object.values(updates), id];

    await db.executeSql(
      `UPDATE transactions SET ${fields}, updatedAt = datetime('now') WHERE id = ?`,
      values
    );
  }

  static async getTransaction(id) {
    const [result] = await db.executeSql(
      'SELECT * FROM transactions WHERE id = ?',
      [id]
    );
    return result.rows.length > 0 ? result.rows.item(0) : null;
  }

  static async getAllTransactions({ limit = 100, offset = 0, category, search, dateFrom, dateTo } = {}) {
    let conditions = [];
    let params = [];

    if (category && category !== 'all') {
      conditions.push('category = ?');
      params.push(category);
    }
    if (search) {
      conditions.push('(merchant LIKE ? OR userNote LIKE ? OR rawSMSText LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (dateFrom) {
      conditions.push('timestamp >= ?');
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push('timestamp <= ?');
      params.push(dateTo);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const [result] = await db.executeSql(
      `SELECT * FROM transactions ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
      params
    );

    const rows = [];
    for (let i = 0; i < result.rows.length; i++) {
      rows.push(result.rows.item(i));
    }
    return rows;
  }

  static async getRecentTransactions(limit = 10) {
    return this.getAllTransactions({ limit });
  }

  static async getMissingInfoTransactions() {
    const [result] = await db.executeSql(
      "SELECT * FROM transactions WHERE status = 'missingInfo' ORDER BY timestamp DESC LIMIT 20"
    );
    const rows = [];
    for (let i = 0; i < result.rows.length; i++) rows.push(result.rows.item(i));
    return rows;
  }

  static async deleteTransaction(id) {
    await db.executeSql('DELETE FROM transactions WHERE id = ?', [id]);
  }

  // ── Analytics ─────────────────────────────────────

  static async getMonthlyTotal(year, month) {
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const to = `${year}-${String(month).padStart(2, '0')}-31`;

    const [result] = await db.executeSql(
      'SELECT SUM(amount) as total, COUNT(*) as count FROM transactions WHERE timestamp BETWEEN ? AND ? AND amount IS NOT NULL',
      [from, to]
    );
    return result.rows.item(0);
  }

  static async getCategoryBreakdown(dateFrom, dateTo) {
    const [result] = await db.executeSql(`
      SELECT category, SUM(amount) as total, COUNT(*) as count
      FROM transactions
      WHERE timestamp BETWEEN ? AND ? AND amount IS NOT NULL
      GROUP BY category
      ORDER BY total DESC
    `, [dateFrom, dateTo]);

    const rows = [];
    for (let i = 0; i < result.rows.length; i++) rows.push(result.rows.item(i));
    return rows;
  }

  static async getDailySpend(dateFrom, dateTo) {
    const [result] = await db.executeSql(`
      SELECT DATE(timestamp) as date, SUM(amount) as total, COUNT(*) as count
      FROM transactions
      WHERE timestamp BETWEEN ? AND ? AND amount IS NOT NULL
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `, [dateFrom, dateTo]);

    const rows = [];
    for (let i = 0; i < result.rows.length; i++) rows.push(result.rows.item(i));
    return rows;
  }

  static async getTopMerchants(dateFrom, dateTo, limit = 5) {
    const [result] = await db.executeSql(`
      SELECT merchant, SUM(amount) as total, COUNT(*) as count
      FROM transactions
      WHERE timestamp BETWEEN ? AND ? AND amount IS NOT NULL AND merchant != 'Unknown'
      GROUP BY merchant
      ORDER BY total DESC
      LIMIT ?
    `, [dateFrom, dateTo, limit]);

    const rows = [];
    for (let i = 0; i < result.rows.length; i++) rows.push(result.rows.item(i));
    return rows;
  }

  // ── Budgets ───────────────────────────────────────

  static async saveBudget(budget) {
    const id = budget.id || `budget_${budget.category}`;
    await db.executeSql(`
      INSERT OR REPLACE INTO budgets (id, category, limitAmount, used, resetFrequency)
      VALUES (?, ?, ?, ?, ?)
    `, [id, budget.category, budget.limitAmount, budget.used || 0, budget.resetFrequency || 'monthly']);
    return id;
  }

  static async getAllBudgets() {
    const [result] = await db.executeSql('SELECT * FROM budgets ORDER BY category');
    const rows = [];
    for (let i = 0; i < result.rows.length; i++) rows.push(result.rows.item(i));
    return rows;
  }

  static async updateBudgetUsed(category, amount) {
    await db.executeSql(
      'UPDATE budgets SET used = used + ? WHERE category = ?',
      [amount, category]
    );
  }

  static async resetBudgets() {
    await db.executeSql('UPDATE budgets SET used = 0');
  }

  // ── Export ────────────────────────────────────────

  static async getAllForExport() {
    return this.getAllTransactions({ limit: 10000 });
  }
}
