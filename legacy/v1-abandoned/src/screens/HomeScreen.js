import React, {useCallback, useEffect, useState} from 'react';
import {
  DeviceEventEmitter,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Database} from '../services/Database';
import {SMSReader} from '../services/SMSReader';
import {CycleEngine} from '../services/CycleEngine';
import {CORE_BASKETS, BasketEngine} from '../services/BasketEngine';

function ClassifyModal({txn, visible, onSave, onDismiss}) {
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('misc');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!txn) {
      return;
    }

    setNote(txn.userNote || '');
    setCategory(txn.suggestedCategory || txn.category || 'misc');
  }, [txn]);

  const handleNoteChange = async text => {
    setNote(text);
    if (text.trim().length < 3) {
      return;
    }

    setAiLoading(true);
    try {
      const result = await BasketEngine.classifyFromText(text, txn);
      if (result?.basketId) {
        setCategory(result.basketId);
      }
    } catch (_) {
      // Keep the current manual selection.
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = () => {
    onSave({category, userNote: note.trim() || null});
  };

  if (!txn) {
    return null;
  }

  const isCredit = txn.flow === 'credit';
  const amountColor = isCredit ? '#06D6A0' : '#EF233C';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <Text style={[modalStyles.amount, {color: amountColor}]}>
            {isCredit ? '+' : '-'}₹{(txn.amount || 0).toLocaleString('en-IN')}
          </Text>
          <Text style={modalStyles.merchant}>{txn.merchant || 'Unknown'}</Text>
          <Text style={modalStyles.meta}>{txn.sourceApp || 'Bank SMS'}</Text>

          <Text style={modalStyles.label}>What was this mostly for?</Text>
          <TextInput
            style={modalStyles.input}
            placeholder="Optional note: dinner with friends, rent share, fuel..."
            placeholderTextColor="#A0A0BB"
            value={note}
            onChangeText={handleNoteChange}
            multiline
          />
          {aiLoading ? (
            <Text style={modalStyles.hint}>Suggesting the best basket…</Text>
          ) : null}

          <Text style={modalStyles.label}>Basket</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={modalStyles.tagRow}>
            {CORE_BASKETS.map(basket => (
              <TouchableOpacity
                key={basket.id}
                style={[
                  modalStyles.tag,
                  category === basket.id && {
                    backgroundColor: basket.bg,
                    borderColor: basket.color,
                  },
                ]}
                onPress={() => setCategory(basket.id)}>
                <Text style={{fontSize: 14}}>{basket.icon}</Text>
                <Text
                  style={[
                    modalStyles.tagText,
                    category === basket.id && {color: basket.color},
                  ]}>
                  {basket.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={modalStyles.saveButton} onPress={handleSave}>
            <Text style={modalStyles.saveText}>Save basket</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={modalStyles.dismissButton}
            onPress={onDismiss}>
            <Text style={modalStyles.dismissText}>Remind me later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function HomeScreen() {
  const [txns, setTxns] = useState([]);
  const [allCycleTxns, setAllCycleTxns] = useState([]);
  const [cycleCtx, setCycleCtx] = useState(null);
  const [summary, setSummary] = useState({
    spent: 0,
    income: 0,
    pending: 0,
    count: 0,
  });
  const [reviewCount, setReviewCount] = useState(0);
  const [classifyTxn, setClassifyTxn] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncState, setSyncState] = useState(null);

  const load = useCallback(async () => {
    await Database.init();
    const ctx = await CycleEngine.getCycleContext();
    const dateFrom = ctx.trackingStart.toISOString();
    const dateTo = new Date().toISOString();

    const [
      transactions,
      cycleTransactions,
      nextSummary,
      nextSyncState,
      appState,
    ] = await Promise.all([
      Database.getTxns({dateFrom, dateTo, limit: 30}),
      Database.getTxns({dateFrom, dateTo, limit: 1000}),
      Database.getSummary(dateFrom, dateTo),
      Database.loadSyncState(),
      Database.loadAppState(),
    ]);

    setCycleCtx(ctx);
    setTxns(transactions);
    setAllCycleTxns(cycleTransactions);
    setSummary(nextSummary);
    setReviewCount(
      cycleTransactions.filter(txn => txn.status === 'review').length,
    );
    setSyncState(nextSyncState);

    const promptTxn = cycleTransactions.find(
      txn => txn.id === appState.promptTxnId && txn.status === 'pending',
    );
    if (promptTxn) {
      setClassifyTxn(promptTxn);
      setModalVisible(true);
    }
  }, []);

  useEffect(() => {
    const subscription = DeviceEventEmitter?.addListener?.(
      'transactions:updated',
      async () => {
        await load();
      },
    );
    const promptSubscription = DeviceEventEmitter?.addListener?.(
      'transactions:prompt',
      txn => {
        if (txn?.status === 'pending') {
          setClassifyTxn(txn);
          setModalVisible(true);
        }
      },
    );

    return () => {
      subscription?.remove?.();
      promptSubscription?.remove?.();
    };
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleClassifySave = async ({category, userNote}) => {
    if (!classifyTxn) {
      return;
    }

    await Database.updateTxn(classifyTxn.id, {
      category,
      userNote,
      status: 'confirmed',
    });
    const key = SMSReader.getMerchantKey(classifyTxn);
    await Database.upsertPattern(
      key,
      classifyTxn.merchant,
      category,
      classifyTxn.amount,
      userNote,
    );
    await Database.applyCategoryToMatchingTransactions(classifyTxn, {
      category,
      userNote,
    });
    await Database.saveAppState({promptTxnId: null});

    setClassifyTxn(null);
    setModalVisible(false);
    DeviceEventEmitter.emit('transactions:updated', {reason: 'classification'});
  };

  const net = summary.income - summary.spent;
  const pendingTxn = allCycleTxns.find(txn => txn.status === 'pending');
  const todaySpent = txns
    .filter(txn => txn.flow === 'debit')
    .filter(
      txn =>
        new Date(txn.timestamp).toDateString() === new Date().toDateString(),
    )
    .reduce((sum, txn) => sum + (txn.amount || 0), 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>SpendSense</Text>
          <Text style={styles.name}>Your tracked spending</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>₹</Text>
        </View>
      </View>

      {cycleCtx?.isPartial ? (
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            Tracking since {CycleEngine.formatDate(cycleCtx.trackingStart)} ·{' '}
            {cycleCtx.daysTracked}/{cycleCtx.totalCycleDays} days in this cycle
          </Text>
        </View>
      ) : null}

      {syncState?.lastError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{syncState.lastError}</Text>
        </View>
      ) : null}

      {summary.pending > 0 ? (
        <TouchableOpacity
          style={styles.pendingBanner}
          onPress={() => {
            if (pendingTxn) {
              setClassifyTxn(pendingTxn);
              setModalVisible(true);
            }
          }}>
          <Text style={styles.pendingText}>
            {summary.pending} recent payment
            {summary.pending > 1 ? 's need' : ' needs'} a purpose. Older history
            has been moved out of the urgent queue.
          </Text>
        </TouchableOpacity>
      ) : null}

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }>
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Spent this cycle</Text>
          <Text style={styles.heroAmount}>
            ₹{Math.round(summary.spent).toLocaleString('en-IN')}
          </Text>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroMetricLabel}>Income</Text>
              <Text style={styles.heroMetricValue}>
                ₹{Math.round(summary.income).toLocaleString('en-IN')}
              </Text>
            </View>
            <View>
              <Text style={styles.heroMetricLabel}>Net</Text>
              <Text
                style={[
                  styles.heroMetricValue,
                  {color: net >= 0 ? '#A7F3D0' : '#FECACA'},
                ]}>
                {net >= 0 ? '+' : '-'}₹
                {Math.abs(Math.round(net)).toLocaleString('en-IN')}
              </Text>
            </View>
            <View>
              <Text style={styles.heroMetricLabel}>Tracked</Text>
              <Text style={styles.heroMetricValue}>{summary.count}</Text>
            </View>
          </View>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Today</Text>
            <Text style={styles.metricValue}>
              ₹{Math.round(todaySpent).toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Needs purpose</Text>
            <Text style={styles.metricValue}>{summary.pending}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Grouped backlog</Text>
            <Text style={styles.metricValue}>{reviewCount}</Text>
          </View>
        </View>

        <View style={styles.listCard}>
          <Text style={styles.cardTitle}>Recent transactions</Text>
          {txns.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No tracked transactions yet</Text>
              <Text style={styles.emptyText}>
                Go to Settings and run a full rescan after granting SMS
                permission.
              </Text>
            </View>
          ) : (
            txns.slice(0, 10).map((txn, index) => {
              const basket =
                CORE_BASKETS.find(
                  item => item.id === (txn.category || txn.suggestedCategory),
                ) || CORE_BASKETS[CORE_BASKETS.length - 1];
              const isCredit = txn.flow === 'credit';
              return (
                <TouchableOpacity
                  key={txn.id}
                  style={[
                    styles.row,
                    index === Math.min(txns.length, 10) - 1 && {
                      borderBottomWidth: 0,
                    },
                  ]}
                  onPress={() => {
                    if (txn.status === 'pending') {
                      setClassifyTxn(txn);
                      setModalVisible(true);
                    }
                  }}>
                  <View style={[styles.rowIcon, {backgroundColor: basket.bg}]}>
                    <Text style={{fontSize: 18}}>{basket.icon}</Text>
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName}>
                      {txn.merchant || 'Unknown'}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {(txn.userNote ||
                        basket.label ||
                        txn.category ||
                        'Needs note') +
                        ' · ' +
                        (txn.sourceApp || 'Bank SMS') +
                        (txn.status === 'review'
                          ? ' · Learned'
                          : txn.status === 'confirmed'
                            ? ' · Confirmed'
                            : '')}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.rowAmount,
                      {color: isCredit ? '#06D6A0' : '#EF233C'},
                    ]}>
                    {isCredit ? '+' : '-'}₹
                    {Math.round(txn.amount || 0).toLocaleString('en-IN')}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      <ClassifyModal
        txn={classifyTxn}
        visible={modalVisible}
        onSave={handleClassifySave}
        onDismiss={async () => {
          await Database.saveAppState({promptTxnId: null});
          setClassifyTxn(null);
          setModalVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#F5F4FF'},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8E6FF',
  },
  greeting: {fontSize: 13, color: '#6B6B8A'},
  name: {fontSize: 22, fontWeight: '800', color: '#1A1A2E', marginTop: 2},
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {fontSize: 16, fontWeight: '700', color: '#5B4FE8'},
  infoBanner: {
    backgroundColor: '#E6F1FB',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  infoBannerText: {fontSize: 12, color: '#0C447C'},
  errorBanner: {
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorText: {fontSize: 12, color: '#9F1239'},
  pendingBanner: {
    backgroundColor: '#5B4FE8',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pendingText: {fontSize: 13, color: '#FFFFFF', fontWeight: '600'},
  scroll: {flex: 1},
  heroCard: {
    margin: 16,
    backgroundColor: '#5B4FE8',
    borderRadius: 16,
    padding: 20,
  },
  heroLabel: {fontSize: 12, color: 'rgba(255,255,255,0.8)'},
  heroAmount: {fontSize: 34, fontWeight: '800', color: '#FFFFFF', marginTop: 2},
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  heroMetricLabel: {fontSize: 11, color: 'rgba(255,255,255,0.7)'},
  heroMetricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    minWidth: 0,
  },
  metricLabel: {fontSize: 12, color: '#6B6B8A', marginBottom: 4},
  metricValue: {fontSize: 22, fontWeight: '700', color: '#1A1A2E'},
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  emptyState: {alignItems: 'center', paddingVertical: 32},
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B6B8A',
    textAlign: 'center',
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8E6FF',
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {flex: 1},
  rowName: {fontSize: 14, fontWeight: '500', color: '#1A1A2E'},
  rowMeta: {fontSize: 12, color: '#6B6B8A', marginTop: 2},
  rowAmount: {fontSize: 15, fontWeight: '700'},
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  handle: {
    width: 38,
    height: 4,
    backgroundColor: '#E8E6FF',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  amount: {fontSize: 28, fontWeight: '800'},
  merchant: {fontSize: 16, fontWeight: '600', color: '#1A1A2E', marginTop: 8},
  meta: {fontSize: 12, color: '#6B6B8A', marginBottom: 16},
  label: {fontSize: 13, color: '#6B6B8A', marginBottom: 6, fontWeight: '500'},
  input: {
    backgroundColor: '#F5F4FF',
    borderWidth: 1.5,
    borderColor: '#E8E6FF',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1A1A2E',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  hint: {fontSize: 12, color: '#5B4FE8', marginTop: 6, marginBottom: 10},
  tagRow: {gap: 8, paddingBottom: 8},
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E8E6FF',
    backgroundColor: '#FFFFFF',
  },
  tagText: {fontSize: 12, fontWeight: '500', color: '#6B6B8A'},
  saveButton: {
    backgroundColor: '#5B4FE8',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 12,
  },
  saveText: {color: '#FFFFFF', fontSize: 15, fontWeight: '700'},
  dismissButton: {alignItems: 'center', paddingVertical: 8},
  dismissText: {fontSize: 13, color: '#A0A0BB'},
});
