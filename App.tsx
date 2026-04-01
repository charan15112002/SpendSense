/**
 * SpendSense — M2 Field Test Build
 *
 * Minimal UI for field testing only. Full UI is M4 scope.
 * This screen shows: listener status, diagnostic mode toggle, evidence export.
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  NativeModules,
  StyleSheet,
  ScrollView,
  NativeEventEmitter,
} from 'react-native';
import {
  getDiagnosticMode,
  setDiagnosticMode,
  exportEvidenceBundle,
  purgeEvidence,
  getEventTimeline,
  getDecisionTrace,
  getPlatformTrace,
  logPlatformEvent,
} from './src/services/DiagnosticLogger';
import {processNotification} from './src/services/DetectionPipeline';

const {SpendSenseDetection, EvidenceExport} = NativeModules;

function App(): React.JSX.Element {
  const [mode, setMode] = useState(getDiagnosticMode());
  const [listenerStatus, setListenerStatus] = useState<{
    isConnected: boolean;
    isEnabled: boolean;
    lastEventTimestamp: number;
  } | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(new Date().toLocaleTimeString());

  const refreshStatus = useCallback(async () => {
    try {
      const status = await SpendSenseDetection.getListenerStatus();
      setListenerStatus(status);
      setEventCount(getEventTimeline().length);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e) {
      // Module may not be available in test
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  // Listen for notifications from native bridge
  useEffect(() => {
    const emitter = new NativeEventEmitter(SpendSenseDetection);
    const sub = emitter.addListener('onNotificationReceived', async (data) => {
      try {
        // Load whitelist and templates from assets (simplified for field test)
        const whitelist = require('./android/app/src/main/assets/package_whitelist.json');
        const templates = require('./android/app/src/main/assets/notification_templates.json');
        const result = await processNotification(
          data.packageName,
          data.rawText,
          data.timestamp,
          whitelist,
          templates,
        );
        if (result) {
          setTxCount(prev => prev + 1);
        }
        setEventCount(getEventTimeline().length);
      } catch (e) {
        logPlatformEvent({event: 'notification_processing_error', detail: {error: String(e)}});
      }
    });
    return () => sub.remove();
  }, []);

  const toggleMode = () => {
    const newMode = mode === 'A' ? 'B' : 'A';
    setDiagnosticMode(newMode);
    setMode(newMode);
  };

  const handleExport = async () => {
    try {
      const deviceInfo = await EvidenceExport.getDeviceInfo();
      const bundle = exportEvidenceBundle({
        build_id: `SS-M2-founder-local-playstore-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`,
        flavor: 'playstore',
        version_name: '0.0.1',
        version_code: 1,
        tester_alias: 'Charan',
        device_model: deviceInfo.model,
        android_version: deviceInfo.androidVersion,
        milestone: 'M2',
        start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      });

      await EvidenceExport.saveToDownloads(
        bundle.manifest.build_id,
        JSON.stringify(bundle.manifest, null, 2),
        bundle.eventTimeline,
        bundle.decisionTrace,
        bundle.platformTrace,
      );

      Alert.alert(
        'Evidence Exported',
        `Saved to Downloads/SpendSense-Evidence/${bundle.manifest.build_id}/\n\n4 files: manifest.json, event-timeline.jsonl, decision-trace.jsonl, platform-trace.jsonl`,
        [
          {text: 'OK'},
          {
            text: 'Share',
            onPress: async () => {
              await EvidenceExport.shareEvidence(
                bundle.manifest.build_id,
                JSON.stringify(bundle.manifest, null, 2),
                bundle.eventTimeline,
                bundle.decisionTrace,
                bundle.platformTrace,
              );
            },
          },
        ],
      );
    } catch (e) {
      Alert.alert('Export Failed', String(e));
    }
  };

  const handlePurge = () => {
    Alert.alert('Purge Evidence?', 'This clears all diagnostic logs from memory. Export first!', [
      {text: 'Cancel'},
      {
        text: 'Purge',
        style: 'destructive',
        onPress: () => {
          purgeEvidence();
          setEventCount(0);
          Alert.alert('Purged', 'All in-memory evidence cleared.');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>SpendSense</Text>
      <Text style={styles.subtitle}>M2 Field Test Build</Text>

      {/* Listener Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notification Listener</Text>
        <Text style={styles.statusText}>
          Status:{' '}
          <Text style={listenerStatus?.isConnected ? styles.green : styles.red}>
            {listenerStatus?.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </Text>
        </Text>
        <Text style={styles.statusText}>
          Permission:{' '}
          <Text style={listenerStatus?.isEnabled ? styles.green : styles.red}>
            {listenerStatus?.isEnabled ? 'GRANTED' : 'NOT GRANTED'}
          </Text>
        </Text>
        {!listenerStatus?.isEnabled && (
          <Text style={styles.warning}>
            Go to Settings → Notifications → Notification access → Turn ON SpendSense
          </Text>
        )}
        <Text style={styles.dimText}>Last refresh: {lastRefresh}</Text>
        <TouchableOpacity style={styles.buttonSmall} onPress={refreshStatus}>
          <Text style={styles.buttonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Detection Stats */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Detection</Text>
        <Text style={styles.statNumber}>{txCount}</Text>
        <Text style={styles.statLabel}>Transactions Detected</Text>
        <Text style={styles.dimText}>{eventCount} diagnostic events recorded</Text>
      </View>

      {/* Diagnostic Mode */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Diagnostic Mode</Text>
        <Text style={styles.statusText}>
          Current: <Text style={styles.bold}>Mode {mode}</Text>
          {mode === 'B' ? ' (Full Capture)' : ' (Minimal Logging)'}
        </Text>
        <TouchableOpacity
          style={[styles.button, mode === 'B' ? styles.buttonActive : styles.buttonInactive]}
          onPress={toggleMode}>
          <Text style={styles.buttonText}>
            Switch to Mode {mode === 'A' ? 'B (Full Capture)' : 'A (Minimal)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Evidence Export */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Evidence Bundle</Text>
        <Text style={styles.dimText}>
          Exports: manifest.json, event-timeline.jsonl, decision-trace.jsonl, platform-trace.jsonl
        </Text>
        <TouchableOpacity style={[styles.button, styles.buttonExport]} onPress={handleExport}>
          <Text style={styles.buttonTextWhite}>Export Evidence Bundle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.buttonDanger]} onPress={handlePurge}>
          <Text style={styles.buttonTextWhite}>Purge Evidence (after export)</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.dimText}>
          Mode B records every pipeline step automatically.{'\n'}
          You do NOT need to write anything down.{'\n'}
          Just make payments and export when done.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5', padding: 16},
  title: {fontSize: 28, fontWeight: 'bold', color: '#1a1a1a', textAlign: 'center', marginTop: 40},
  subtitle: {fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20},
  card: {backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2},
  cardTitle: {fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8},
  statusText: {fontSize: 14, color: '#444', marginBottom: 4},
  statNumber: {fontSize: 48, fontWeight: 'bold', color: '#1a73e8', textAlign: 'center'},
  statLabel: {fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 4},
  green: {color: '#34a853', fontWeight: '600'},
  red: {color: '#ea4335', fontWeight: '600'},
  bold: {fontWeight: '700'},
  dimText: {fontSize: 12, color: '#999', marginTop: 4},
  warning: {fontSize: 13, color: '#ea4335', marginTop: 8, fontStyle: 'italic'},
  button: {borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 8},
  buttonSmall: {borderRadius: 6, padding: 8, alignItems: 'center', marginTop: 8, backgroundColor: '#e8eaed'},
  buttonActive: {backgroundColor: '#34a853'},
  buttonInactive: {backgroundColor: '#e8eaed'},
  buttonExport: {backgroundColor: '#1a73e8'},
  buttonDanger: {backgroundColor: '#ea4335'},
  buttonText: {fontSize: 14, fontWeight: '600', color: '#333'},
  buttonTextWhite: {fontSize: 14, fontWeight: '600', color: '#fff'},
  footer: {padding: 16, alignItems: 'center'},
});

export default App;
