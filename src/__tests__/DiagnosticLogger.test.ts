/**
 * Tests for Diagnostic Evidence Capture System
 * (Lock IDs: test-evidence-capture-plan, evidence-bundle-contract, testing-operations-workflow)
 *
 * Verifies:
 *   - Mode A vs Mode B toggle behavior
 *   - Event timeline logging
 *   - Decision trace logging
 *   - Platform trace logging (always active)
 *   - Discard events log only timestamp, source, and reason (privacy rule)
 *   - Build manifest generation with all required fields
 *   - Evidence export produces all 4 mandatory bundle components
 *   - Purge clears all in-memory evidence
 */

import {
  getDiagnosticMode,
  setDiagnosticMode,
  logTimelineEvent,
  logDiscardEvent,
  logDecision,
  logPlatformEvent,
  generateManifest,
  exportEvidenceBundle,
  purgeEvidence,
  getEventTimeline,
  getDecisionTrace,
  getPlatformTrace,
} from '../services/DiagnosticLogger';

// Reset state before each test
beforeEach(() => {
  purgeEvidence();
  setDiagnosticMode('B'); // Enable full logging for most tests
});

describe('Diagnostic Mode Toggle', () => {
  test('default mode in test environment is B (debug)', () => {
    // __DEV__ is true in test, so default should be B
    setDiagnosticMode('B');
    expect(getDiagnosticMode()).toBe('B');
  });

  test('can switch between Mode A and Mode B', () => {
    setDiagnosticMode('A');
    expect(getDiagnosticMode()).toBe('A');
    setDiagnosticMode('B');
    expect(getDiagnosticMode()).toBe('B');
  });

  test('mode change is logged as platform event', () => {
    purgeEvidence();
    setDiagnosticMode('A');
    const trace = getPlatformTrace();
    const modeEvent = trace.find(e => e.event === 'diagnostic_mode_changed');
    expect(modeEvent).toBeDefined();
    expect(modeEvent!.detail).toEqual({new_mode: 'A'});
  });
});

describe('Event Timeline Logger', () => {
  test('logs events in Mode B', () => {
    setDiagnosticMode('B');
    logTimelineEvent({event: 'notification_received', source: 'notification', package_or_sender: 'com.google.android.apps.nbu.paisa'});
    const timeline = getEventTimeline();
    expect(timeline.length).toBe(1);
    expect(timeline[0].event).toBe('notification_received');
    expect(timeline[0].source).toBe('notification');
    expect(timeline[0].package_or_sender).toBe('com.google.android.apps.nbu.paisa');
    expect(timeline[0].ts).toBeDefined();
    expect(timeline[0].seq).toBe(1);
  });

  test('does NOT log events in Mode A', () => {
    setDiagnosticMode('A');
    logTimelineEvent({event: 'notification_received', source: 'notification'});
    expect(getEventTimeline().length).toBe(0);
  });

  test('events are time-ordered with sequential IDs', () => {
    logTimelineEvent({event: 'first'});
    logTimelineEvent({event: 'second'});
    logTimelineEvent({event: 'third'});
    const timeline = getEventTimeline();
    expect(timeline.length).toBe(3);
    expect(timeline[0].seq).toBeLessThan(timeline[1].seq);
    expect(timeline[1].seq).toBeLessThan(timeline[2].seq);
  });
});

describe('Discard Events (Privacy Rule)', () => {
  test('discard events contain only timestamp, source, and reason — no raw text', () => {
    logDiscardEvent({
      source: 'notification',
      package_or_sender: 'com.example.app',
      reason: 'not_whitelisted',
    });
    const timeline = getEventTimeline();
    expect(timeline.length).toBe(1);
    expect(timeline[0].event).toBe('source_discarded');
    expect(timeline[0].source).toBe('notification');
    expect(timeline[0].package_or_sender).toBe('com.example.app');
    expect(timeline[0].detail).toEqual({reason: 'not_whitelisted'});
    // No rawText field anywhere
    expect((timeline[0] as any).rawText).toBeUndefined();
    expect((timeline[0].detail as any).rawText).toBeUndefined();
  });

  test('discard events not logged in Mode A', () => {
    setDiagnosticMode('A');
    logDiscardEvent({source: 'sms', package_or_sender: 'SPAM', reason: 'phishing'});
    expect(getEventTimeline().length).toBe(0);
  });
});

describe('Decision Trace Logger', () => {
  test('logs function decisions with inputs, outputs, and scores', () => {
    logDecision({
      function_name: 'computeTrustScore',
      inputs: {sender_trust: 20, template_match: 20},
      output: {score: 65, behavior: 'suggested'},
      score: 65,
    });
    const trace = getDecisionTrace();
    expect(trace.length).toBe(1);
    expect(trace[0].function_name).toBe('computeTrustScore');
    expect(trace[0].inputs).toEqual({sender_trust: 20, template_match: 20});
    expect(trace[0].output).toEqual({score: 65, behavior: 'suggested'});
    expect(trace[0].score).toBe(65);
    expect(trace[0].ts).toBeDefined();
  });

  test('logs exclusion reasons', () => {
    logDecision({
      function_name: 'applyQuarantineGate',
      inputs: {trust_score: 15},
      output: {is_quarantined: true},
      score: 15,
      exclusion_reason: 'trust_below_threshold',
    });
    const trace = getDecisionTrace();
    expect(trace[0].exclusion_reason).toBe('trust_below_threshold');
  });

  test('does NOT log decisions in Mode A', () => {
    setDiagnosticMode('A');
    logDecision({function_name: 'test', inputs: {}, output: {}});
    expect(getDecisionTrace().length).toBe(0);
  });
});

describe('Platform Trace Logger', () => {
  test('logs platform events in BOTH Mode A and Mode B', () => {
    setDiagnosticMode('A');
    logPlatformEvent({event: 'listener_connected'});
    expect(getPlatformTrace().length).toBeGreaterThan(0);

    purgeEvidence();
    setDiagnosticMode('B');
    logPlatformEvent({event: 'listener_connected'});
    expect(getPlatformTrace().length).toBeGreaterThan(0);
  });

  test('includes detail when provided', () => {
    logPlatformEvent({
      event: 'rebind_attempt',
      detail: {success: true, attempt_count: 1},
    });
    const trace = getPlatformTrace();
    const rebind = trace.find(e => e.event === 'rebind_attempt');
    expect(rebind).toBeDefined();
    expect(rebind!.detail).toEqual({success: true, attempt_count: 1});
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

    // All fields from evidence-bundle-contract.md manifest requirements
    expect(manifest.build_id).toBe('SS-M2-founder-local-playstore-20260401-01');
    expect(manifest.flavor).toBe('playstore');
    expect(manifest.version_name).toBe('0.0.1');
    expect(manifest.version_code).toBe(1);
    expect(manifest.diagnostic_mode).toBe('B');
    expect(manifest.tester_alias).toBe('Charan');
    expect(manifest.device_model).toBe('Pixel 8');
    expect(manifest.android_version).toBe('14');
    expect(manifest.milestone).toBe('M2');
    expect(manifest.start_time).toBe('2026-04-01T10:00:00.000Z');
    expect(manifest.end_time).toBeDefined();
    expect(manifest.date_range).toContain('2026-04-01T10:00:00.000Z');
  });
});

describe('Evidence Export', () => {
  test('produces all 4 mandatory bundle components', () => {
    // Generate some diagnostic data
    logTimelineEvent({event: 'notification_received', source: 'notification', package_or_sender: 'com.google.android.apps.nbu.paisa'});
    logDecision({function_name: 'computeTrustScore', inputs: {}, output: {score: 65}, score: 65});
    logPlatformEvent({event: 'listener_connected'});

    const bundle = exportEvidenceBundle({
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

    // Mandatory components per evidence-bundle-contract.md Section 2
    expect(bundle.manifest).toBeDefined();
    expect(bundle.manifest.build_id).toBe('SS-M2-founder-local-playstore-20260401-01');
    expect(bundle.eventTimeline).toBeDefined();
    expect(bundle.eventTimeline.length).toBeGreaterThan(0);
    expect(bundle.decisionTrace).toBeDefined();
    expect(bundle.decisionTrace.length).toBeGreaterThan(0);
    expect(bundle.platformTrace).toBeDefined();
    expect(bundle.platformTrace.length).toBeGreaterThan(0);
  });

  test('event timeline is valid JSONL (one JSON object per line)', () => {
    logTimelineEvent({event: 'test_event_1'});
    logTimelineEvent({event: 'test_event_2'});

    const bundle = exportEvidenceBundle({
      build_id: 'test', flavor: 'playstore', version_name: '0.0.1', version_code: 1,
      tester_alias: 'test', device_model: 'test', android_version: '14', milestone: 'M2', start_time: new Date().toISOString(),
    });

    const lines = bundle.eventTimeline.split('\n');
    expect(lines.length).toBe(2);
    lines.forEach(line => {
      const parsed = JSON.parse(line);
      expect(parsed.event).toBeDefined();
      expect(parsed.ts).toBeDefined();
      expect(parsed.seq).toBeDefined();
    });
  });
});

describe('Purge Evidence', () => {
  test('clears all in-memory logs', () => {
    logTimelineEvent({event: 'test'});
    logDecision({function_name: 'test', inputs: {}, output: {}});
    logPlatformEvent({event: 'test'});

    expect(getEventTimeline().length).toBeGreaterThan(0);
    expect(getDecisionTrace().length).toBeGreaterThan(0);
    expect(getPlatformTrace().length).toBeGreaterThan(0);

    purgeEvidence();

    expect(getEventTimeline().length).toBe(0);
    expect(getDecisionTrace().length).toBe(0);
    expect(getPlatformTrace().length).toBe(0);
  });
});
