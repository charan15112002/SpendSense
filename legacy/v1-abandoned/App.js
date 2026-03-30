import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  DeviceEventEmitter,
  Linking,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Database} from './src/services/Database';
import {TransactionTracker} from './src/services/TransactionTracker';
import {SMSReader} from './src/services/SMSReader';
import {NativeTracking} from './src/services/NativeTracking';
import {AIService} from './src/services/AIService';

import HomeScreen from './src/screens/HomeScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import BudgetsScreen from './src/screens/BudgetsScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function GeminiKeyModal({visible, onSave, onSkip}) {
  const [key, setKey] = useState('');

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={geminiStyles.overlay}>
        <View style={geminiStyles.sheet}>
          <Text style={geminiStyles.title}>🤖 Enable AI-Powered Tracking</Text>
          <Text style={geminiStyles.desc}>
            SpendSense uses Google Gemini AI to accurately read your bank SMS
            and detect real transactions. This dramatically improves accuracy
            — no more false detections.
          </Text>
          <Text style={geminiStyles.desc}>
            It's <Text style={{fontWeight: '700'}}>100% free</Text> — Google
            gives 1,500 requests/day at no cost.
          </Text>

          <TouchableOpacity
            style={geminiStyles.linkBtn}
            onPress={() =>
              Linking.openURL('https://aistudio.google.com/apikey')
            }>
            <Text style={geminiStyles.linkText}>
              👉 Get your free API key from aistudio.google.com
            </Text>
          </TouchableOpacity>

          <Text style={geminiStyles.stepLabel}>Steps:</Text>
          <Text style={geminiStyles.step}>
            1. Tap the link above → Sign in with Google
          </Text>
          <Text style={geminiStyles.step}>
            2. Click "Create API key" → Copy the key
          </Text>
          <Text style={geminiStyles.step}>
            3. Paste it below
          </Text>

          <TextInput
            style={geminiStyles.input}
            placeholder="Paste your Gemini API key here"
            placeholderTextColor="#A0A0BB"
            value={key}
            onChangeText={setKey}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[
              geminiStyles.saveBtn,
              !key.trim() && {opacity: 0.5},
            ]}
            disabled={!key.trim()}
            onPress={() => onSave(key.trim())}>
            <Text style={geminiStyles.saveBtnText}>Enable AI Tracking</Text>
          </TouchableOpacity>

          <TouchableOpacity style={geminiStyles.skipBtn} onPress={onSkip}>
            <Text style={geminiStyles.skipText}>
              Skip for now (use basic tracking)
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const geminiStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 12,
  },
  desc: {
    fontSize: 14,
    color: '#4A4A6A',
    lineHeight: 20,
    marginBottom: 8,
  },
  linkBtn: {
    backgroundColor: '#EEF0FF',
    borderRadius: 12,
    padding: 14,
    marginVertical: 12,
  },
  linkText: {
    fontSize: 13,
    color: '#5B4FE8',
    fontWeight: '600',
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A2E',
    marginTop: 8,
    marginBottom: 4,
  },
  step: {
    fontSize: 13,
    color: '#6B6B8A',
    marginLeft: 8,
    marginBottom: 2,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E0E0F0',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#1A1A2E',
    marginTop: 16,
    backgroundColor: '#FAFAFF',
  },
  saveBtn: {
    backgroundColor: '#5B4FE8',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  skipText: {
    color: '#9090AA',
    fontSize: 13,
  },
});
const ICONS = {
  Home: '🏠',
  Transactions: '📋',
  Budgets: '💼',
  Insights: '📊',
  Settings: '⚙️',
};

export default function App() {
  const bootstrappedRef = useRef(false);
  const [showGeminiModal, setShowGeminiModal] = useState(false);

  useEffect(() => {
    if (bootstrappedRef.current) {
      return undefined;
    }

    bootstrappedRef.current = true;
    let mounted = true;

    const bootstrap = async () => {
      try {
        await Database.init();
        await Database.log('app_launch', 'App', Platform.OS);

        // Check if Gemini key is set — if not, show the setup modal
        const hasKey = await AIService.hasApiKey();
        const appState = await Database.loadAppState();
        if (!hasKey && !appState.geminiKeySkipped && mounted) {
          setShowGeminiModal(true);
        }

        if (Platform.OS === 'android') {
          const permissions = await TransactionTracker.requestPermissions();
          if (!permissions.smsPermissionGranted && mounted) {
            Alert.alert(
              'SMS permission needed',
              'SpendSense needs SMS access to read bank alerts and backfill your transactions.',
            );
          }

          const notificationAccessEnabled =
            await NativeTracking.isNotificationAccessEnabled();
          const lastReminderAt = new Date(
            appState.notificationReminderAt || 0,
          ).getTime();
          const shouldRemindNotificationAccess =
            !notificationAccessEnabled &&
            (!lastReminderAt ||
              Number.isNaN(lastReminderAt) ||
              Date.now() - lastReminderAt > 24 * 60 * 60 * 1000);

          if (shouldRemindNotificationAccess && mounted) {
            Alert.alert(
              'Enable notification access',
              'Turn on notification access for SpendSense so UPI app confirmations from GPay, PhonePe, Paytm, and similar apps are captured immediately.',
            );
            await Database.saveAppState({
              notificationReminderAt: new Date().toISOString(),
            });
          }
        }

        SMSReader.setTransactionCallback(async txn => {
          await Database.saveAppState({
            promptTxnId: txn?.id || null,
            promptRequestedAt: new Date().toISOString(),
          });
          DeviceEventEmitter.emit('transactions:prompt', txn);
        });

        await TransactionTracker.initialize();
      } catch (error) {
        await Database.saveSyncState({
          lastError: error?.message || 'Bootstrap failed',
        });
      }
    };

    bootstrap();

    return () => {
      mounted = false;
      TransactionTracker.stop();
    };
  }, []);

  const handleGeminiKeySave = async key => {
    await AIService.setApiKey(key);
    setShowGeminiModal(false);
    Alert.alert(
      'AI Enabled ✓',
      'SpendSense will now use AI to accurately detect your transactions. Run a rescan in Settings to re-process existing SMS.',
    );
  };

  const handleGeminiKeySkip = async () => {
    await Database.saveAppState({geminiKeySkipped: true});
    setShowGeminiModal(false);
  };

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <GeminiKeyModal
        visible={showGeminiModal}
        onSave={handleGeminiKeySave}
        onSkip={handleGeminiKeySkip}
      />
      <Tab.Navigator
        screenOptions={({route}) => ({
          tabBarIcon: () => (
            <Text style={{fontSize: 20}}>{ICONS[route.name]}</Text>
          ),
          tabBarActiveTintColor: '#5B4FE8',
          tabBarInactiveTintColor: '#B2BEC3',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#F0F0F0',
            height: 62,
            paddingBottom: 8,
          },
          headerShown: false,
        })}>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Transactions" component={TransactionsScreen} />
        <Tab.Screen name="Budgets" component={BudgetsScreen} />
        <Tab.Screen name="Insights" component={InsightsScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
