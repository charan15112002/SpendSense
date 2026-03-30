import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  FlatList,
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
import {CORE_BASKETS} from '../services/BasketEngine';

const FLOW_FILTERS = ['All', 'Outgoing', 'Incoming', 'Transfer'];
const STATUS_FILTERS = ['All', 'Needs purpose', 'Learned', 'Confirmed'];

export default function TransactionsScreen() {
  const [txns, setTxns] = useState([]);
  const [search, setSearch] = useState('');
  const [flowFilter, setFlowFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    await Database.init();
    const all = await Database.getTxns({limit: 1200});
    setTxns(all);
    setLoading(false);
    await Database.log('screen_view', 'Transactions');
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return txns.filter(txn => {
      const matchesSearch =
        !query ||
        [
          txn.merchant,
          txn.userNote,
          txn.category,
          txn.suggestedCategory,
          txn.amount,
          txn.bank,
          txn.sourceApp,
        ]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(query));

      const matchesFlow =
        flowFilter === 'All' ||
        (flowFilter === 'Outgoing' && txn.flow === 'debit') ||
        (flowFilter === 'Incoming' && txn.flow === 'credit') ||
        (flowFilter === 'Transfer' && txn.flow === 'transfer');

      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Needs purpose' && txn.status === 'pending') ||
        (statusFilter === 'Learned' && txn.status === 'review') ||
        (statusFilter === 'Confirmed' && txn.status === 'confirmed');

      return matchesSearch && matchesFlow && matchesStatus;
    });
  }, [flowFilter, search, statusFilter, txns]);

  const totalShown = filtered
    .filter(txn => txn.flow === 'debit')
    .reduce((sum, txn) => sum + (txn.amount || 0), 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.count}>{filtered.length} shown</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Search merchant, category, note, amount..."
          placeholderTextColor="#A0A0BB"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}>
        {FLOW_FILTERS.map(item => (
          <TouchableOpacity
            key={item}
            style={[styles.chip, flowFilter === item && styles.chipSelected]}
            onPress={() => setFlowFilter(item)}>
            <Text
              style={[
                styles.chipText,
                flowFilter === item && styles.chipTextSelected,
              ]}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}>
        {STATUS_FILTERS.map(item => (
          <TouchableOpacity
            key={item}
            style={[styles.chip, statusFilter === item && styles.chipSelected]}
            onPress={() => setStatusFilter(item)}>
            <Text
              style={[
                styles.chipText,
                statusFilter === item && styles.chipTextSelected,
              ]}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {flowFilter === 'Outgoing' && totalShown > 0 ? (
        <View style={styles.totalRow}>
          <Text style={styles.totalText}>
            Total outgoing shown: ₹
            {Math.round(totalShown).toLocaleString('en-IN')}
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#5B4FE8" />
          <Text style={styles.loadingText}>
            Loading transactions without blocking the rest of the app…
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          initialNumToRender={18}
          maxToRenderPerBatch={24}
          windowSize={8}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {txns.length === 0
                  ? 'No tracked transactions yet'
                  : 'No results found'}
              </Text>
              <Text style={styles.emptyText}>
                {txns.length === 0
                  ? 'Use Settings to run a rescan after granting SMS permission.'
                  : 'Try a different filter or search term.'}
              </Text>
            </View>
          }
          renderItem={({item}) => {
            const basket =
              CORE_BASKETS.find(
                entry => entry.id === (item.category || item.suggestedCategory),
              ) || CORE_BASKETS[CORE_BASKETS.length - 1];
            const isCredit = item.flow === 'credit';
            const isTransfer = item.flow === 'transfer';
            const amountColor = isCredit
              ? '#06D6A0'
              : isTransfer
              ? '#5B4FE8'
              : '#EF233C';
            const amountPrefix = isCredit ? '+' : isTransfer ? '↔' : '-';
            const statusLabel =
              item.status === 'pending'
                ? 'Needs purpose'
                : item.status === 'review'
                ? 'Learned'
                : item.autoClassified
                ? 'Auto'
                : 'Confirmed';

            return (
              <View style={styles.row}>
                <View style={[styles.icon, {backgroundColor: basket.bg}]}>
                  <Text style={{fontSize: 18}}>{basket.icon}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.merchant || 'Unknown'}</Text>
                  <Text style={styles.meta}>
                    {(item.userNote || basket.label || 'Needs purpose') +
                      ' · ' +
                      (item.sourceApp || 'Bank SMS') +
                      ' · ' +
                      new Date(item.timestamp).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                  </Text>
                </View>
                <View style={styles.amountWrap}>
                  <Text style={[styles.amount, {color: amountColor}]}>
                    {amountPrefix}₹
                    {Math.round(item.amount || 0).toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.status}>{statusLabel}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
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
  title: {fontSize: 20, fontWeight: '700', color: '#1A1A2E'},
  count: {fontSize: 13, color: '#6B6B8A'},
  searchWrap: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  search: {
    backgroundColor: '#F5F4FF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E8E6FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A2E',
  },
  filterScroll: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8E6FF',
    maxHeight: 50,
  },
  filterContent: {paddingHorizontal: 16, gap: 8, paddingVertical: 8},
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E8E6FF',
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {backgroundColor: '#EEF0FF', borderColor: '#5B4FE8'},
  chipText: {fontSize: 13, color: '#6B6B8A', fontWeight: '500'},
  chipTextSelected: {color: '#5B4FE8'},
  totalRow: {
    backgroundColor: '#EEF0FF',
    borderRadius: 10,
    padding: 12,
    margin: 16,
    marginBottom: 8,
  },
  totalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5B4FE8',
    textAlign: 'center',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {marginTop: 10, color: '#6B6B8A', textAlign: 'center'},
  list: {flex: 1},
  listContent: {padding: 16, paddingTop: 8},
  empty: {alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20},
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
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8E6FF',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 8,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {flex: 1, minWidth: 0},
  name: {fontSize: 14, fontWeight: '500', color: '#1A1A2E'},
  meta: {fontSize: 12, color: '#6B6B8A', marginTop: 2},
  amountWrap: {alignItems: 'flex-end'},
  amount: {fontSize: 14, fontWeight: '700'},
  status: {marginTop: 4, fontSize: 10, color: '#6B6B8A', fontWeight: '700'},
});
