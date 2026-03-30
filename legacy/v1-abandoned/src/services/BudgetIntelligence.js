import {CORE_BASKETS} from './BasketEngine';

const MIN_LIMITS = {
  food: 1000,
  groceries: 1200,
  travel: 800,
  bills: 1000,
  shopping: 800,
  medical: 500,
  entertainment: 500,
  subscription: 300,
  emi: 1000,
  investment: 1000,
  family: 500,
  misc: 500,
};

function roundTo50(value) {
  return Math.max(0, Math.round(value / 50) * 50);
}

function getMonthKey(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 7);
}

export class BudgetIntelligence {
  static buildAdaptiveBudget(transactions, monthlyIncome = 0) {
    const debitTxns = transactions.filter(
      txn =>
        txn.flow === 'debit' &&
        txn.status !== 'ignored' &&
        txn.category &&
        txn.category !== 'transfer',
    );

    if (!debitTxns.length) {
      return {
        categories: [],
        plannedSpend: 0,
        observedSpend: 0,
        savingsBuffer: monthlyIncome || 0,
        monthsObserved: 0,
        confidence: 0,
      };
    }

    const byMonth = {};
    debitTxns.forEach(txn => {
      const category = txn.category || txn.suggestedCategory || 'misc';
      const monthKey = getMonthKey(txn.timestamp);
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = {};
      }
      byMonth[monthKey][category] =
        (byMonth[monthKey][category] || 0) + (txn.amount || 0);
    });

    const monthKeys = Object.keys(byMonth).sort();
    const recentMonthKey = monthKeys[monthKeys.length - 1];
    const previousMonthKey = monthKeys[monthKeys.length - 2];

    const categories = CORE_BASKETS.map(basket => {
      const totals = monthKeys.map(
        monthKey => byMonth[monthKey]?.[basket.id] || 0,
      );
      const avgMonthly = totals.length
        ? totals.reduce((sum, value) => sum + value, 0) / totals.length
        : 0;
      const recent = byMonth[recentMonthKey]?.[basket.id] || 0;
      const previous = byMonth[previousMonthKey]?.[basket.id] || 0;
      const weighted =
        recent > 0 ? recent * 0.6 + avgMonthly * 0.4 : avgMonthly;
      const limit = roundTo50(
        Math.max(weighted * 1.1, MIN_LIMITS[basket.id] || 0),
      );

      return {
        ...basket,
        used: Math.round(recent),
        limit,
        avgMonthly: Math.round(avgMonthly),
        trend: Math.round(recent - previous),
      };
    }).filter(row => row.limit > 0 && (row.used > 0 || row.avgMonthly > 0));

    const plannedSpend = categories.reduce((sum, row) => sum + row.limit, 0);
    const observedSpend = categories.reduce((sum, row) => sum + row.used, 0);

    return {
      categories: categories.sort((left, right) => right.limit - left.limit),
      plannedSpend,
      observedSpend,
      savingsBuffer: monthlyIncome
        ? Math.max(monthlyIncome - plannedSpend, 0)
        : null,
      monthsObserved: monthKeys.length,
      confidence: Math.min(debitTxns.length / 40, 1),
    };
  }
}
