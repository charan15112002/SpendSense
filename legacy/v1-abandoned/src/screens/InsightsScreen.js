import React, {useCallback, useEffect, useState} from 'react';
import {
  DeviceEventEmitter,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Database} from '../services/Database';
import {CycleEngine} from '../services/CycleEngine';
import {CORE_BASKETS} from '../services/BasketEngine';
import {InsightEngine} from '../services/InsightEngine';

const PERIODS = [
  {key: 'week', label: 'This week'},
  {key: 'cycle', label: 'This cycle'},
  {key: 'last_cycle', label: 'Last cycle'},
  {key: 'six_months', label: '6 months'},
];

function SpendBar({data}) {
  const max = Math.max(...data.map(item => item.spent || 0), 1);
  return (
    <View style={{flexDirection: 'row', alignItems: 'flex-end', height: 110}}>
      {data.map(item => (
        <View
          key={item.label}
          style={{flex: 1, alignItems: 'center', justifyContent: 'flex-end'}}>
          <View
            style={{
              width: '65%',
              height: Math.max(
                Math.round(((item.spent || 0) / max) * 80),
                item.spent > 0 ? 4 : 0,
              ),
              backgroundColor: '#5B4FE8',
              borderRadius: 4,
              marginBottom: 6,
            }}
          />
          <Text style={{fontSize: 9, color: '#6B6B8A'}} numberOfLines={1}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function InsightsScreen() {
  const [period, setPeriod] = useState('cycle');
  const [chartData, setChartData] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const ctx = await CycleEngine.getCycleContext();
    const profile = await Database.loadProfile();
    const now = new Date();
    let dateFrom;
    let dateTo = now.toISOString();

    if (period === 'week') {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      dateFrom = start.toISOString();
    } else if (period === 'cycle') {
      dateFrom = ctx.trackingStart.toISOString();
    } else if (period === 'last_cycle') {
      const previousEnd = new Date(ctx.currentCycle.start.getTime() - 1);
      const previousBounds = CycleEngine.getCycleBoundary(
        previousEnd,
        ctx.cycleDay,
      );
      dateFrom = previousBounds.start.toISOString();
      dateTo = previousBounds.end.toISOString();
    } else {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 6);
      dateFrom = start.toISOString();
    }

    const [txns, daily] = await Promise.all([
      Database.getTxns({dateFrom, dateTo, limit: 2000}),
      Database.getDailySpend(dateFrom, dateTo),
    ]);

    setSnapshot(
      InsightEngine.buildSnapshot(txns, {
        monthlyIncome: Number(profile.monthlyIncome) || 0,
        pendingCount: txns.filter(txn => txn.status === 'pending').length,
      }),
    );

    if (period === 'week' || period === 'cycle') {
      setChartData(
        daily.slice(-14).map(item => ({
          label: item.date.substring(5).replace('-', '/'),
          spent: Math.round(item.total),
        })),
      );
    } else {
      const weekly = {};
      daily.forEach(item => {
        const date = new Date(item.date);
        const key = `W${Math.ceil(
          date.getDate() / 7,
        )} ${date.toLocaleDateString('en-IN', {month: 'short'})}`;
        if (!weekly[key]) {
          weekly[key] = {label: key, spent: 0};
        }
        weekly[key].spent += Math.round(item.total);
      });
      setChartData(Object.values(weekly).slice(-10));
    }
  }, [period]);

  useEffect(() => {
    const subscription = DeviceEventEmitter?.addListener?.(
      'transactions:updated',
      load,
    );
    return () => subscription?.remove?.();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          contentContainerStyle={styles.tabContent}>
          {PERIODS.map(item => (
            <TouchableOpacity
              key={item.key}
              style={[styles.tab, period === item.key && styles.tabSelected]}
              onPress={() => setPeriod(item.key)}>
              <Text
                style={[
                  styles.tabText,
                  period === item.key && styles.tabTextSelected,
                ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {snapshot ? (
          <>
            <View style={styles.summaryRow}>
              {snapshot.glanceCards.map(card => (
                <View key={card.key} style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>{card.label}</Text>
                  <Text
                    style={[styles.summaryValue, {color: card.tone}]}
                    numberOfLines={1}>
                    {card.key === 'review'
                      ? card.value
                      : `${card.value >= 0 ? '' : '-'}₹${Math.abs(
                          Math.round(card.value || 0),
                        ).toLocaleString('en-IN')}`}
                  </Text>
                  <Text style={styles.summaryHelper}>{card.helper}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Money flow at a glance</Text>
              {snapshot.headlineInsights.map(item => (
                <View
                  key={item.title}
                  style={[styles.headlineRow, {borderLeftColor: item.tone}]}>
                  <Text style={styles.headlineTitle}>{item.title}</Text>
                  <Text style={styles.headlineText}>{item.text}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Spending trend</Text>
              {chartData.length === 0 ? (
                <Text style={styles.emptyText}>
                  No tracked data for this period yet.
                </Text>
              ) : (
                <SpendBar data={chartData} />
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Where money went</Text>
              {snapshot.categories.slice(0, 6).map(item => {
                const basket =
                  CORE_BASKETS.find(entry => entry.id === item.category) ||
                  CORE_BASKETS[CORE_BASKETS.length - 1];
                const pct =
                  snapshot.totalSpent > 0
                    ? Math.round((item.total / snapshot.totalSpent) * 100)
                    : 0;
                return (
                  <View key={item.category} style={styles.categoryRow}>
                    <View
                      style={[
                        styles.categoryIcon,
                        {backgroundColor: basket.bg},
                      ]}>
                      <Text>{basket.icon}</Text>
                    </View>
                    <View style={{flex: 1}}>
                      <View style={styles.categoryTop}>
                        <Text style={styles.categoryName}>{basket.label}</Text>
                        <Text style={styles.categoryAmount}>
                          ₹{Math.round(item.total).toLocaleString('en-IN')}
                        </Text>
                      </View>
                      <Text style={styles.categoryMeta}>
                        {pct}% · {item.count} transactions
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Recurring spend you should know
              </Text>
              {snapshot.recurring.length === 0 ? (
                <Text style={styles.emptyText}>
                  No clear recurring merchants yet.
                </Text>
              ) : (
                snapshot.recurring.map(merchant => (
                  <View key={merchant.merchant} style={styles.merchantRow}>
                    <View>
                      <Text style={styles.merchantName}>
                        {merchant.merchant}
                      </Text>
                      <Text style={styles.merchantMeta}>
                        {merchant.count} repeat payments
                      </Text>
                    </View>
                    <Text style={styles.merchantAmount}>
                      ₹{Math.round(merchant.total).toLocaleString('en-IN')}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#F5F4FF'},
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8E6FF',
  },
  title: {fontSize: 20, fontWeight: '700', color: '#1A1A2E'},
  scroll: {flex: 1},
  tabScroll: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8E6FF',
    maxHeight: 52,
  },
  tabContent: {paddingHorizontal: 16, gap: 8, paddingVertical: 10},
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E8E6FF',
    backgroundColor: '#FFFFFF',
  },
  tabSelected: {backgroundColor: '#EEF0FF', borderColor: '#5B4FE8'},
  tabText: {fontSize: 13, color: '#6B6B8A', fontWeight: '500'},
  tabTextSelected: {color: '#5B4FE8', fontWeight: '700'},
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    margin: 16,
    marginBottom: 0,
  },
  summaryBox: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
  },
  summaryLabel: {fontSize: 11, color: '#6B6B8A', marginBottom: 4},
  summaryValue: {fontSize: 16, fontWeight: '700'},
  summaryHelper: {fontSize: 11, color: '#8B91A8', marginTop: 4, lineHeight: 16},
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 16,
    marginBottom: 0,
    padding: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 14,
  },
  emptyText: {fontSize: 13, color: '#6B6B8A', lineHeight: 20},
  headlineRow: {borderLeftWidth: 3, paddingLeft: 12, marginBottom: 12},
  headlineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  headlineText: {fontSize: 13, color: '#4B5563', lineHeight: 20},
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryName: {fontSize: 13, fontWeight: '500', color: '#1A1A2E'},
  categoryAmount: {fontSize: 13, fontWeight: '600', color: '#1A1A2E'},
  categoryMeta: {fontSize: 11, color: '#6B6B8A'},
  merchantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'center',
  },
  merchantName: {fontSize: 13, color: '#1A1A2E', fontWeight: '600'},
  merchantMeta: {fontSize: 11, color: '#6B6B8A', marginTop: 2},
  merchantAmount: {fontSize: 13, fontWeight: '600', color: '#1A1A2E'},
});
