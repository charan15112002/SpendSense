/**
 * @format
 * Smoke test: verifies App component renders without crashing.
 * All native modules and services are mocked since they require a device.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

// Mock NativeEventEmitter
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      addListener: jest.fn(() => ({remove: jest.fn()})),
      removeAllListeners: jest.fn(),
    })),
  };
});

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.NativeModules.SpendSenseDetection = {
    getListenerStatus: jest.fn().mockResolvedValue({
      isConnected: false,
      isEnabled: false,
      lastEventTimestamp: 0,
    }),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  };
  RN.NativeModules.EvidenceExport = {
    getDeviceInfo: jest.fn().mockResolvedValue({model: 'Pixel 8', androidVersion: '14'}),
    saveToDownloads: jest.fn().mockResolvedValue({path: '/test', fileCount: 4}),
  };
  return RN;
});

// Mock all service modules (they use SQLite which isn't available in test)
jest.mock('../src/services/DiagnosticLogger', () => ({
  getDiagnosticMode: jest.fn().mockReturnValue('B'),
  setDiagnosticMode: jest.fn().mockResolvedValue(undefined),
  initDiagnosticMode: jest.fn().mockResolvedValue(undefined),
  exportEvidenceBundle: jest.fn().mockResolvedValue({manifest: {}, eventTimeline: '', decisionTrace: '', platformTrace: ''}),
  purgeEvidence: jest.fn().mockResolvedValue(undefined),
  getEventCount: jest.fn().mockResolvedValue(0),
  logPlatformEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/database/TransactionRepository', () => ({
  getAllTransactions: jest.fn().mockResolvedValue([]),
}));

jest.mock('../src/services/DetectionPipeline', () => ({
  processNotification: jest.fn().mockResolvedValue(null),
}));

import App from '../App';

test('renders without crashing', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    // Let useEffect callbacks resolve
    await new Promise(resolve => setImmediate(resolve));
  });
  expect(renderer!.toJSON()).toBeTruthy();
  // Clean unmount to stop intervals
  await ReactTestRenderer.act(async () => {
    renderer!.unmount();
  });
}, 15000);
