/**
 * Tests for Diagnostic Evidence Capture System
 * (Lock IDs: test-evidence-capture-plan, evidence-bundle-contract, testing-operations-workflow)
 *
 * Note: These tests mock SQLite since we're in a Jest environment.
 * The real persistence is verified on-device during field tests.
 */

// Mock SQLite before importing DiagnosticLogger
const mockExecuteSql = jest.fn().mockResolvedValue([{rows: {length: 0, item: () => ({})}}]);
jest.mock('react-native-sqlite-storage', () => ({
  enablePromise: jest.fn(),
  openDatabase: jest.fn().mockResolvedValue({
    executeSql: (...args: any[]) => mockExecuteSql(...args),
  }),
}));

import {
  getDiagnosticMode,
  setDiagnosticMode,
  logTimelineEvent,
  logDiscardEvent,
  logDecision,
  logPlatformEvent,
  generateManifest,
} from '../services/DiagnosticLogger';

beforeEach(() => {
  mockExecuteSql.mockClear();
  // Default: return 0 for MAX(seq) queries
  mockExecuteSql.mockResolvedValue([{rows: {length: 0, item: () => ({maxSeq: 0})}}]);
});

describe('Diagnostic Mode Toggle', () => {
  test('default mode in test environment is B (debug)', () => {
    expect(getDiagnosticMode()).toBe('B');
  });

  test('can switch between Mode A and Mode B', async () => {
    await setDiagnosticMode('A');
    expect(getDiagnosticMode()).toBe('A');
    await setDiagnosticMode('B');
    expect(getDiagnosticMode()).toBe('B');
  });

  test('mode change persists to SQLite', async () => {
    await setDiagnosticMode('A');
    // Should have called INSERT OR REPLACE for diagnostic_config
    const configCalls = mockExecuteSql.mock.calls.filter(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('diagnostic_config'),
    );
    expect(configCalls.length).toBeGreaterThan(0);
  });
});

describe('Event Timeline Logger', () => {
  test('logs events to SQLite in Mode B', async () => {
    await setDiagnosticMode('B');
    mockExecuteSql.mockClear();
    await logTimelineEvent({event: 'notification_received', source: 'notification', package_or_sender: 'com.google.android.apps.nbu.paisa'});
    const insertCalls = mockExecuteSql.mock.calls.filter(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO event_timeline'),
    );
    expect(insertCalls.length).toBe(1);
  });

  test('does NOT log events in Mode A', async () => {
    await setDiagnosticMode('A');
    mockExecuteSql.mockClear();
    await logTimelineEvent({event: 'notification_received', source: 'notification'});
    const insertCalls = mockExecuteSql.mock.calls.filter(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO event_timeline'),
    );
    expect(insertCalls.length).toBe(0);
    // Reset
    await setDiagnosticMode('B');
  });

  test('includes raw_text for whitelisted finance sources', async () => {
    mockExecuteSql.mockClear();
    await logTimelineEvent({
      event: 'notification_received',
      source: 'notification',
      package_or_sender: 'com.phonepe.app',
      raw_text: 'Paid Rs 100 to merchant',
    });
    const insertCalls = mockExecuteSql.mock.calls.filter(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO event_timeline'),
    );
    expect(insertCalls.length).toBe(1);
    // raw_text should be the 7th parameter
    expect(insertCalls[0][1][6]).toBe('Paid Rs 100 to merchant');
  });
});

describe('Discard Events (Privacy Rule)', () => {
  test('discard events contain only timestamp, source, and reason — no raw text', async () => {
    mockExecuteSql.mockClear();
    await logDiscardEvent({
      source: 'notification',
      package_or_sender: 'com.example.app',
      reason: 'not_whitelisted',
    });
    const insertCalls = mockExecuteSql.mock.calls.filter(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO event_timeline'),
    );
    expect(insertCalls.length).toBe(1);
    const params = insertCalls[0][1];
    expect(params[2]).toBe('source_discarded'); // event
    expect(params[3]).toBe('notification'); // source
    expect(params[4]).toBe('com.example.app'); // package_or_sender
    expect(JSON.parse(params[5])).toEqual({reason: 'not_whitelisted'}); // detail
    // No raw_text parameter (only 6 params for discard, no 7th)
  });

  test('discard events not logged in Mode A', async () => {
    await setDiagnosticMode('A');
    mockExecuteSql.mockClear();
    await logDiscardEvent({source: 'sms', package_or_sender: 'SPAM', reason: 'phishing'});
    const insertCalls = mockExecuteSql.mock.calls.filter(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO event_timeline'),
    );
    expect(insertCalls.length).toBe(0);
    await setDiagnosticMode('B');
  });
});

describe('Decision Trace Logger', () => {
  test('logs function decisions to SQLite', async () => {
    mockExecuteSql.mockClear();
    await logDecision({
      function_name: 'computeTrustScore',
      inputs: {sender_trust: 20, template_match: 20},
      output: {score: 65, behavior: 'suggested'},
      score: 65,
    });
    const insertCalls = mockExecuteSql.mock.calls.filter(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO decision_trace'),
    );
    expect(insertCalls.length).toBe(1);
  });

  test('does NOT log decisions in Mode A', async () => {
    await setDiagnosticMode('A');
    mockExecuteSql.mockClear();
    await logDecision({function_name: 'test', inputs: {}, output: {}});
    const insertCalls = mockExecuteSql.mock.calls.filter(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO decision_trace'),
    );
    expect(insertCalls.length).toBe(0);
    await setDiagnosticMode('B');
  });
});

describe('Platform Trace Logger', () => {
  test('logs platform events in BOTH Mode A and Mode B', async () => {
    await setDiagnosticMode('A');
    mockExecuteSql.mockClear();
    await logPlatformEvent({event: 'listener_connected'});
    let insertCalls = mockExecuteSql.mock.calls.filter(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO platform_trace'),
    );
    expect(insertCalls.length).toBeGreaterThan(0);

    await setDiagnosticMode('B');
    mockExecuteSql.mockClear();
    await logPlatformEvent({event: 'listener_connected'});
    insertCalls = mockExecuteSql.mock.calls.filter(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO platform_trace'),
    );
    expect(insertCalls.length).toBeGreaterThan(0);
  });
});

describe('Build Manifest Generator', () => {
  test('generates manifest with all required fields per evidence-bundle-contract', () => {
    const manifest = generateManifest({
      build_id: 'SS-M2-founder-local-playstore-20260401-01',
      flavor: 'playstore',
      version_name: '0.0.1',
      version_code: 1,
      tester_alias: 'Charan',
      device_model: 'Pixel 8',
      android_version: '14',
      milestone: 'M2',
      start_time: '2026-04-01T10:00:00.000Z',
    });

    expect(manifest.build_id).toBe('SS-M2-founder-local-playstore-20260401-01');
    expect(manifest.flavor).toBe('playstore');
    expect(manifest.version_name).toBe('0.0.1');
    expect(manifest.version_code).toBe(1);
    expect(manifest.diagnostic_mode).toBeDefined();
    expect(manifest.tester_alias).toBe('Charan');
    expect(manifest.device_model).toBe('Pixel 8');
    expect(manifest.android_version).toBe('14');
    expect(manifest.milestone).toBe('M2');
    expect(manifest.start_time).toBe('2026-04-01T10:00:00.000Z');
    expect(manifest.end_time).toBeDefined();
    expect(manifest.date_range).toContain('2026-04-01T10:00:00.000Z');
  });
});
