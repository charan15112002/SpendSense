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
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {Database} from '../services/Database';
import {CycleEngine} from '../services/CycleEngine';
import {BudgetIntelligence} from '../services/BudgetIntelligence';

export default function BudgetsScreen() {
  const navigation = useNavigation();
  const [budgetSnapshot, setBudgetSnapshot] = useState(null);
  const [cycleLabel, setCycleLabel] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [incomeInfo, setIncomeInfo] = useState({value: 0, source: 'unknown'});

  const load = useCallback(async () => {
    const [profile, ctx] = await Promise.all([
      Database.loadProfile(),
      CycleEngine.getCycleContext(),
    ]);

    const dateFrom = new Date();
    dateFrom.setMonth(dateFrom.getMonth() - 3);

    const [history, summary] = await Promise.all([
      Database.getTxns({
        flow: 'debit',
        dateFrom: dateFrom.toISOString(),
        limit: 2000,
      }),
      Database.getSummary(
        ctx.trackingStart.toISOString(),
        new Date().toISOString(),
      ),
    ]);

    const explicitIncome = Number(profile.monthlyIncome) || 0;
    const estimatedIncome = Math.round(summary.income || 0);
    const effectiveIncome = explicitIncome || estimatedIncome;

    setCycleLabel(ctx.cycleLabel || '');
    setIncomeInfo({
      value: effectiveIncome,
      source: explicitIncome
        ? 'profile'
        : estimatedIncome
        ? 'estimated'
        : 'unknown',
    });
    setBudgetSnapshot(
      BudgetIntelligence.buildAdaptiveBudget(history, effectiveIncome),
    );
    setLoaded(true);
  }, []);

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

  if (loaded && !incomeInfo.value) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Budgets</Text>
        </View>
        <View style={styles.emptyWrap}>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              Add monthly income to unlock planning
            </Text>
            <Text style={styles.emptyText}>
              SpendSense now learns category limits from actual behavior instead
              of forcing a fixed split. Add your monthly income in Settings so
              we can show spend room and savings buffer.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.primaryButtonText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!loaded || !budgetSnapshot) {
    return <SafeAreaView style={styles.safe} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Budgets</Text>
          <Text style={styles.sub}>{cycleLabel || 'Adaptive spend plan'}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <View style={styles.explainer}>
          <Text style={styles.explainerTitle}>Adaptive budget logic</Text>
          <Text style={styles.explainerText}>
            These limits are learned from your last{' '}
            {budgetSnapshot.monthsObserved || 0} month
            {budgetSnapshot.monthsObserved === 1 ? '' : 's'} of actual spend,
            with extra weight on the latest month so the plan can adapt when
            life changes.
          </Text>
          <Text style={styles.explainerSub}>
            Income source:{' '}
            {incomeInfo.source === 'profile'
              ? 'Saved income from Settings'
              : 'Estimated from tracked credits'}
          </Text>
        </View>

        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Planned spend</Text>
            <Text style={styles.statValue}>
              ₹{budgetSnapshot.plannedSpend.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Observed this month</Text>
            <Text style={styles.statValue}>
              ₹{budgetSnapshot.observedSpend.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {budgetSnapshot.savingsBuffer !== null ? (
          <View style={styles.bufferCard}>
            <Text style={styles.bufferLabel}>
              Expected savings / flexibility
            </Text>
            <Text style={styles.bufferValue}>
              ₹
              {Math.round(budgetSnapshot.savingsBuffer).toLocaleString('en-IN')}
            </Text>
          </View>
        ) : null}

        {budgetSnapshot.categories.map(budget => {
          const pct =
            budget.limit > 0
              ? Math.round((budget.used / budget.limit) * 100)
              : 0;
          const barColor =
            pct > 90 ? '#EF233C' : pct > 70 ? '#FFB703' : budget.color;
          const remaining = budget.limit - budget.used;

          return (
            <View
              key={budget.id}
              style={[styles.card, {borderLeftColor: budget.color}]}>
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <Text style={{fontSize: 20}}>{budget.icon}</Text>
                  <View>
                    <Text style={styles.categoryName}>{budget.label}</Text>
                    <Text style={styles.categoryMeta}>
                      Avg ₹{budget.avgMonthly.toLocaleString('en-IN')}
                      {budget.trend !== 0
                        ? ` · ${budget.trend > 0 ? '+' : '-'}₹${Math.abs(
                            budget.trend,
                          ).toLocaleString('en-IN')} vs last month`
                        : ''}
                    </Text>
                  </View>
                </View>
                <Text style={styles.usedAmount}>
                  ₹{budget.used.toLocaleString('en-IN')} / ₹
                  {budget.limit.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>
              <Text style={styles.remainingText}>
                {remaining >= 0
                  ? `₹${remaining.toLocaleString(
                      'en-IN',
                    )} still available in this learned bucket`
                  : `₹${Math.abs(remaining).toLocaleString(
                      'en-IN',
                    )} above the learned range`}
              </Text>
            </View>
          );
        })}
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
  sub: {fontSize: 12, color: '#6B6B8A', marginTop: 2},
  scroll: {flex: 1, padding: 16},
  explainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  explainerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 6,
  },
  explainerText: {fontSize: 13, color: '#4B5563', lineHeight: 20},
  explainerSub: {fontSize: 11, color: '#6B7280', marginTop: 6},
  statRow: {flexDirection: 'row', gap: 12, marginBottom: 14},
  stat: {flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14},
  statLabel: {fontSize: 12, color: '#6B6B8A', marginBottom: 4},
  statValue: {fontSize: 20, fontWeight: '700', color: '#1A1A2E'},
  bufferCard: {
    backgroundColor: '#EEF0FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  bufferLabel: {
    fontSize: 12,
    color: '#5B4FE8',
    marginBottom: 4,
    fontWeight: '600',
  },
  bufferValue: {fontSize: 24, fontWeight: '800', color: '#5B4FE8'},
  emptyWrap: {flex: 1, padding: 16},
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#6B6B8A',
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: '#5B4FE8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {color: '#FFFFFF', fontWeight: '700'},
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardLeft: {flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1},
  categoryName: {fontSize: 14, fontWeight: '600', color: '#1A1A2E'},
  categoryMeta: {fontSize: 11, color: '#6B6B8A', marginTop: 2},
  usedAmount: {fontSize: 13, fontWeight: '600', color: '#1A1A2E'},
  barBg: {
    height: 7,
    backgroundColor: '#E8E6FF',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {height: '100%', borderRadius: 4},
  remainingText: {fontSize: 11, color: '#6B6B8A', marginTop: 6},
});
