/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

// Mock native modules required by App.tsx
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.NativeModules.SpendSenseDetection = {
    getListenerStatus: jest.fn().mockResolvedValue({
      isConnected: false,
      isEnabled: false,
      lastEventTimestamp: 0,
    }),
  };
  RN.NativeModules.EvidenceExport = {
    getDeviceInfo: jest.fn().mockResolvedValue({
      model: 'Pixel 8',
      androidVersion: '14',
    }),
    saveToDownloads: jest.fn().mockResolvedValue({path: '/test', fileCount: 4}),
  };
  return RN;
});

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
