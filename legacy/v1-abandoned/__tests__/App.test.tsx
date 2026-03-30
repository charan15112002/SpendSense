/**
 * @format
 */

import 'react-native';
import React from 'react';
import App from '../App';

// Note: import explicitly to use the types shipped with jest.
import {it, jest} from '@jest/globals';

// Note: test renderer must be required after react-native.
import renderer from 'react-test-renderer';
const {act} = renderer;

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@react-navigation/native', () => {
  return {
    NavigationContainer: ({children}: {children: React.ReactNode}) => children,
    useFocusEffect: () => {},
    useNavigation: () => ({navigate: jest.fn()}),
  };
});
jest.mock('@react-navigation/bottom-tabs', () => {
  const mockReact = require('react');
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({children}: {children: React.ReactNode}) => children,
      Screen: ({component: Component}: {component: React.ComponentType}) =>
        mockReact.createElement(Component),
    }),
  };
});
jest.mock('../src/services/Database', () => ({
  Database: (() => {
    const {jest: jestGlobal} = require('@jest/globals');
    return {
      init: jestGlobal.fn().mockResolvedValue(true),
      log: jestGlobal.fn().mockResolvedValue(undefined),
      saveAppState: jestGlobal.fn().mockResolvedValue(undefined),
      saveSyncState: jestGlobal.fn().mockResolvedValue(undefined),
    };
  })(),
}));
jest.mock('../src/services/TransactionTracker', () => ({
  TransactionTracker: (() => {
    const {jest: jestGlobal} = require('@jest/globals');
    return {
      requestPermissions: jestGlobal.fn().mockResolvedValue({
        smsPermissionGranted: true,
        notificationPermissionGranted: true,
      }),
      initialize: jestGlobal.fn().mockResolvedValue(undefined),
      stop: jestGlobal.fn(),
    };
  })(),
}));
jest.mock('../src/services/SMSReader', () => ({
  SMSReader: (() => {
    const {jest: jestGlobal} = require('@jest/globals');
    return {
      setTransactionCallback: jestGlobal.fn(),
    };
  })(),
}));

it('renders correctly', async () => {
  let tree;
  await act(async () => {
    tree = renderer.create(<App />);
    await Promise.resolve();
  });
  tree?.unmount();
});
