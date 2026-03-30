import {CORE_BASKETS} from './BasketEngine';

function percentage(part, total) {
  if (!total) {
    return 0;
  }

  return Math.round((part / total) * 100);
}

export class InsightEngine {
  static buildSnapshot(
    transactions,
    {monthlyIncome = 0, pendingCount = 0} = {},
  ) {
    const debitTxns = transactions.filter(
      txn => txn.flow === 'debit' && txn.status !== 'ignored',
    );
    const creditTxns = transactions.filter(
      txn => txn.flow === 'credit' && txn.status !== 'ignored',
    );
    const totalSpent = debitTxns.reduce(
      (sum, txn) => sum + (txn.amount || 0),
      0,
    );
    const totalIncome = creditTxns.reduce(
      (sum, txn) => sum + (txn.amount || 0),
      0,
    );
    const net = totalIncome - totalSpent;

    const categoryRows = {};
    debitTxns.forEach(txn => {
      const key = txn.category || txn.suggestedCategory || 'misc';
      if (!categoryRows[key]) {
        categoryRows[key] = {category: key, total: 0, count: 0};
      }
      categoryRows[key].total += txn.amount || 0;
      categoryRows[key].count += 1;
    });

    const categories = Object.values(categoryRows).sort(
      (left, right) => right.total - left.total,
    );
    const topCategory = categories[0] || null;

    const merchantRows = {};
    debitTxns.forEach(txn => {
      const merchant = txn.merchant || 'Unknown';
      if (!merchantRows[merchant]) {
        merchantRows[merchant] = {merchant, total: 0, count: 0};
      }
      merchantRows[merchant].total += txn.amount || 0;
      merchantRows[merchant].count += 1;
    });
    const topMerchant =
      Object.values(merchantRows).sort(
        (left, right) => right.total - left.total,
      )[0] || null;
    const recurring = Object.values(merchantRows)
      .filter(row => row.count >= 3)
      .sort((left, right) => right.count - left.count)
      .slice(0, 3);

    const glanceCards = [
      {
        key: 'spent',
        label: 'Spent',
        value: totalSpent,
        tone: '#EF233C',
        helper: `${debitTxns.length} outgoing transactions`,
      },
      {
        key: 'income',
        label: 'Income',
        value: totalIncome,
        tone: '#06D6A0',
        helper: `${creditTxns.length} incoming transactions`,
      },
      {
        key: 'net',
        label: 'Net flow',
        value: net,
        tone: net >= 0 ? '#06D6A0' : '#EF233C',
        helper: monthlyIncome
          ? `${percentage(totalSpent, monthlyIncome)}% of income spent`
          : 'Based on tracked money flow',
      },
      {
        key: 'review',
        label: 'Needs review',
        value: pendingCount,
        tone: pendingCount > 0 ? '#FFB703' : '#5B4FE8',
        helper:
          pendingCount > 0
            ? 'Recent payments still need context'
            : 'No urgent follow-up',
      },
    ];

    const headlineInsights = [];
    if (topCategory) {
      const basket =
        CORE_BASKETS.find(item => item.id === topCategory.category) ||
        CORE_BASKETS[CORE_BASKETS.length - 1];
      headlineInsights.push({
        title: `${basket.label} is driving most spend`,
        text: `It accounts for ${percentage(
          topCategory.total,
          totalSpent,
        )}% of tracked outflow this period.`,
        tone: basket.color,
      });
    }

    if (topMerchant) {
      headlineInsights.push({
        title: `${topMerchant.merchant} is your top money sink`,
        text: `You spent ₹${Math.round(topMerchant.total).toLocaleString(
          'en-IN',
        )} across ${topMerchant.count} payments.`,
        tone: '#5B4FE8',
      });
    }

    if (monthlyIncome) {
      const savingsHeadroom = monthlyIncome - totalSpent;
      headlineInsights.push({
        title:
          savingsHeadroom >= 0
            ? 'You still have room this cycle'
            : 'This cycle is running heavy',
        text:
          savingsHeadroom >= 0
            ? `About ₹${Math.round(savingsHeadroom).toLocaleString(
                'en-IN',
              )} is still unspent against your income.`
            : `You are ₹${Math.round(Math.abs(savingsHeadroom)).toLocaleString(
                'en-IN',
              )} above monthly income.`,
        tone: savingsHeadroom >= 0 ? '#06D6A0' : '#EF233C',
      });
    }

    return {
      totalSpent,
      totalIncome,
      net,
      categories,
      recurring,
      topMerchant,
      glanceCards,
      headlineInsights,
    };
  }
}
