import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  DeviceEventEmitter,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Database} from '../services/Database';
import {NativeTracking} from '../services/NativeTracking';
import {TransactionTracker} from '../services/TransactionTracker';

export default function SettingsScreen() {
  const [profile, setProfile] = useState({
    name: 'You',
    cycleDay: '26',
    monthlyIncome: '',
    trackingWindowDays: '365',
  });
  const [syncState, setSyncState] = useState(null);
  const [txnCount, setTxnCount] = useState(0);
  const [logCount, setLogCount] = useState(0);
  const [notificationAccessEnabled, setNotificationAccessEnabled] =
    useState(false);
  const [scanning, setScanning] = useState(false);
  const [syncingRecent, setSyncingRecent] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const load = useCallback(async () => {
    const [storedProfile, txns, logs, nextSyncState, key] = await Promise.all([
      Database.loadProfile(),
      Database.getTxns({limit: 5000}),
      Database.getActivityLog(500),
      Database.loadSyncState(),
      AsyncStorage.getItem('gemini_api_key'),
    ]);

    setProfile({
      name: storedProfile.name || 'You',
      cycleDay: String(storedProfile.cycleDay || 26),
      monthlyIncome: storedProfile.monthlyIncome
        ? String(storedProfile.monthlyIncome)
        : '',
      trackingWindowDays: String(storedProfile.trackingWindowDays || 365),
    });
    setTxnCount(txns.length);
    setLogCount(logs.length);
    setSyncState(nextSyncState);
    setApiKey(key || '');
    setNotificationAccessEnabled(
      await NativeTracking.isNotificationAccessEnabled(),
    );
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

  const saveProfile = async () => {
    const cycleDay = Math.min(Math.max(Number(profile.cycleDay) || 26, 1), 28);
    const monthlyIncome = Number(profile.monthlyIncome) || null;
    const trackingWindowDays = Math.min(
      Math.max(Number(profile.trackingWindowDays) || 365, 30),
      730,
    );

    await Database.saveProfile({
      name: profile.name?.trim() || 'You',
      cycleDay,
      monthlyIncome,
      trackingWindowDays,
    });

    await load();
    Alert.alert(
      'Saved',
      'Your profile and tracking settings have been updated.',
    );
  };

  const saveApiKey = async () => {
    if (apiKey && apiKey.length < 10) {
      Alert.alert(
        'Invalid key',
        'Please paste a valid Gemini API key from aistudio.google.com.',
      );
      return;
    }

    await AsyncStorage.setItem('gemini_api_key', apiKey.trim());
    Alert.alert('Saved', 'Gemini AI key saved. SMS parsing will now use AI for better accuracy.');
  };

  const runFullRescan = async () => {
    setScanning(true);
    try {
      const permissions = await TransactionTracker.requestPermissions();
      if (!permissions.smsPermissionGranted) {
        Alert.alert(
          'Permission needed',
          'Please grant SMS permission and run the rescan again.',
        );
        return;
      }

      const daysBack = Number(profile.trackingWindowDays) || 365;
      const result = await TransactionTracker.syncAll({
        daysBack,
        reason: 'manual',
      });
      await load();
      Alert.alert(
        'Rescan complete',
        `${result.addedCount} new transaction${
          result.addedCount === 1 ? '' : 's'
        } were added.`,
      );
    } catch (error) {
      Alert.alert('Rescan failed', error?.message || 'Unknown error');
    } finally {
      setScanning(false);
    }
  };

  const syncRecentActivity = async () => {
    setSyncingRecent(true);
    try {
      const result = await TransactionTracker.flushPendingNativeEvents({
        reason: 'manual_recent_sync',
      });
      await load();
      Alert.alert(
        'Recent sync complete',
        `${result.addedCount || 0} new transaction${
          result.addedCount === 1 ? '' : 's'
        } detected from recent SMS and app notifications.`,
      );
    } catch (error) {
      Alert.alert(
        'Recent sync failed',
        error?.message || 'Unable to sync recent activity right now.',
      );
    } finally {
      setSyncingRecent(false);
    }
  };

  const openNotificationAccess = async () => {
    try {
      await NativeTracking.openNotificationAccessSettings();
    } catch (_) {
      Alert.alert(
        'Open Android settings',
        'Please enable notification access for SpendSense manually.',
      );
    }
  };

  const exportActivityLog = async () => {
    const logText = await Database.exportActivityLog();
    if (!logText) {
      Alert.alert('Nothing to export', 'No activity has been recorded yet.');
      return;
    }

    await Share.share({message: logText, title: 'SpendSense Activity Log'});
  };

  const exportTransactions = async () => {
    const txns = await Database.getTxns({limit: 5000});
    if (!txns.length) {
      Alert.alert(
        'Nothing to export',
        'No transactions have been tracked yet.',
      );
      return;
    }

    const header = 'Date,Amount,Flow,Merchant,Category,Note,Source\n';
    const rows = txns.map(txn =>
      [
        txn.timestamp?.substring(0, 10),
        txn.amount,
        txn.flow,
        `"${txn.merchant || ''}"`,
        `"${txn.category || ''}"`,
        `"${txn.userNote || ''}"`,
        `"${txn.sourceApp || ''}"`,
      ].join(','),
    );

    await Share.share({
      message: header + rows.join('\n'),
      title: 'SpendSense Transactions',
    });
  };

  const fixDuplicates = () => {
    Alert.alert(
      'Fix duplicate transactions?',
      'This will remove Gmail-sourced entries and merge duplicate payments detected from multiple sources (e.g. same ₹X appearing from both Bank SMS and Paytm).',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Fix now',
          onPress: async () => {
            // Reset V5 migration flag so purge runs again on next init
            await Database.saveAppState({storageMigrationV5: false});
            const removed = await Database.purgeJunkTransactions();
            await Database.saveAppState({storageMigrationV5: true});
            await load();
            Alert.alert(
              'Done',
              removed > 0
                ? `Removed ${removed} duplicate or junk transaction${removed === 1 ? '' : 's'}.`
                : 'No duplicates found — your transactions look clean!',
            );
          },
        },
      ],
    );
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear all data?',
      'This will delete all tracked transactions and settings.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await Database.clearAll();
            await AsyncStorage.removeItem('budget_style');
            await load();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile and budget inputs</Text>
          <LabeledInput
            label="Name"
            value={profile.name}
            onChangeText={value => setProfile(prev => ({...prev, name: value}))}
          />
          <LabeledInput
            label="Cycle starts on day"
            value={profile.cycleDay}
            onChangeText={value =>
              setProfile(prev => ({
                ...prev,
                cycleDay: value.replace(/[^0-9]/g, ''),
              }))
            }
            keyboardType="number-pad"
          />
          <LabeledInput
            label="Monthly income (₹)"
            value={profile.monthlyIncome}
            onChangeText={value =>
              setProfile(prev => ({
                ...prev,
                monthlyIncome: value.replace(/[^0-9]/g, ''),
              }))
            }
            keyboardType="number-pad"
          />
          <LabeledInput
            label="Rescan window (days)"
            value={profile.trackingWindowDays}
            onChangeText={value =>
              setProfile(prev => ({
                ...prev,
                trackingWindowDays: value.replace(/[^0-9]/g, ''),
              }))
            }
            keyboardType="number-pad"
          />
          <TouchableOpacity style={styles.primaryButton} onPress={saveProfile}>
            <Text style={styles.primaryButtonText}>Save profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tracking status</Text>
          <View style={styles.statRow}>
            <Stat label="Transactions" value={txnCount} />
            <Stat label="Activity logs" value={logCount} />
          </View>
          <Text style={styles.metaText}>
            Last full scan:{' '}
            {syncState?.lastFullScanAt
              ? new Date(syncState.lastFullScanAt).toLocaleString('en-IN')
              : 'Not yet'}
          </Text>
          <Text style={styles.metaText}>
            Notification access:{' '}
            {notificationAccessEnabled ? 'Enabled' : 'Not enabled'}
          </Text>
          <Text style={styles.metaText}>
            SMS permission:{' '}
            {syncState?.smsPermissionGranted ? 'Enabled' : 'Not enabled'}
          </Text>
          {syncState?.lastError ? (
            <Text style={styles.errorText}>{syncState.lastError}</Text>
          ) : null}
          <TouchableOpacity
            style={[styles.outlineButton, syncingRecent && styles.disabled]}
            onPress={syncRecentActivity}
            disabled={syncingRecent}>
            <Text style={styles.outlineButtonText}>
              {syncingRecent ? 'Syncing recent activity...' : 'Sync recent activity'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, scanning && styles.disabled]}
            onPress={runFullRescan}
            disabled={scanning}>
            <Text style={styles.primaryButtonText}>
              {scanning ? 'Scanning…' : 'Run full rescan'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={openNotificationAccess}>
            <Text style={styles.outlineButtonText}>
              Open notification access
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={fixDuplicates}>
            <Text style={styles.outlineButtonText}>
              Fix duplicate transactions
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>AI key</Text>
          <LabeledInput
            label="Gemini API key (free from aistudio.google.com)"
            value={apiKey}
            onChangeText={setApiKey}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <TouchableOpacity style={styles.primaryButton} onPress={saveApiKey}>
            <Text style={styles.primaryButtonText}>Save AI key</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Export</Text>
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={exportActivityLog}>
            <Text style={styles.outlineButtonText}>Share activity log</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={exportTransactions}>
            <Text style={styles.outlineButtonText}>
              Export transactions as CSV text
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={[styles.cardTitle, {color: '#EF233C'}]}>
            Danger zone
          </Text>
          <TouchableOpacity style={styles.dangerButton} onPress={clearAllData}>
            <Text style={styles.dangerButtonText}>Clear all app data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LabeledInput({label, ...props}) {
  return (
    <View style={{marginBottom: 12}}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        {...props}
        style={styles.input}
        placeholderTextColor="#A0A0BB"
      />
    </View>
  );
}

function Stat({label, value}) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  scroll: {flex: 1, padding: 16},
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 12,
  },
  inputLabel: {fontSize: 12, color: '#6B6B8A', marginBottom: 6},
  input: {
    backgroundColor: '#F5F4FF',
    borderWidth: 1.5,
    borderColor: '#E8E6FF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#1A1A2E',
  },
  primaryButton: {
    backgroundColor: '#5B4FE8',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {color: '#FFFFFF', fontWeight: '600', fontSize: 14},
  outlineButton: {
    borderWidth: 1.5,
    borderColor: '#E8E6FF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  outlineButtonText: {fontSize: 13, color: '#1A1A2E', fontWeight: '500'},
  dangerButton: {
    borderWidth: 1.5,
    borderColor: '#EF233C',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerButtonText: {fontSize: 13, color: '#EF233C', fontWeight: '600'},
  statRow: {flexDirection: 'row', gap: 12, marginBottom: 12},
  statBox: {
    flex: 1,
    backgroundColor: '#F5F4FF',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {fontSize: 22, fontWeight: '700', color: '#5B4FE8'},
  statLabel: {fontSize: 11, color: '#6B6B8A', marginTop: 2},
  metaText: {fontSize: 12, color: '#6B6B8A', marginBottom: 6},
  errorText: {fontSize: 12, color: '#9F1239', marginBottom: 8},
  disabled: {opacity: 0.6},
});
