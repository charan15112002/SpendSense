/**
 * Diagnostic Evidence Capture System (Lock IDs: test-evidence-capture-plan, evidence-bundle-contract)
 *
 * Mode A: Normal release logging — minimal operational logging, no verbose timeline
 * Mode B: Founder diagnostic mode — full event timeline, decision traces, platform traces
 *
 * BUG 1 FIX: All evidence persisted to SQLite (survives app process kill).
 * Previous version used in-memory arrays which were wiped when Android killed the process.
 *
 * Evidence stays on-device until manually exported (no background upload).
 * Non-financial raw content is NOT stored — only timestamp, source, and reason for discards.
 * Whitelisted finance source raw text IS stored per test-evidence-capture-plan.md Section 3.
 *
 * Bundle components (evidence-bundle-contract.md Section 2):
 *   - manifest.json
 *   - event-timeline.jsonl
 *   - decision-trace.jsonl
 *   - platform-trace.jsonl
 */

import {getDatabase} from '../database/connection';

// --- Diagnostic Mode Toggle (persisted to SQLite) ---

export type DiagnosticMode = 'A' | 'B';

let cachedMode: DiagnosticMode | null = null;

export async function initDiagnosticMode(): Promise<void> {
  try {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      "SELECT value FROM diagnostic_config WHERE key = 'diagnostic_mode'",
    );
    if (result.rows.length > 0) {
      cachedMode = result.rows.item(0).value as DiagnosticMode;
    } else {
      // Default: Mode B for debug, Mode A for release
      const defaultMode: DiagnosticMode = __DEV__ ? 'B' : 'A';
      await db.executeSql(
        "INSERT OR REPLACE INTO diagnostic_config (key, value) VALUES ('diagnostic_mode', ?)",
        [defaultMode],
      );
      cachedMode = defaultMode;
    }
  } catch {
    cachedMode = __DEV__ ? 'B' : 'A';
  }
}

export function getDiagnosticMode(): DiagnosticMode {
  return cachedMode ?? (__DEV__ ? 'B' : 'A');
}

export async function setDiagnosticMode(mode: DiagnosticMode): Promise<void> {
  cachedMode = mode;
  try {
    const db = await getDatabase();
    await db.executeSql(
      "INSERT OR REPLACE INTO diagnostic_config (key, value) VALUES ('diagnostic_mode', ?)",
      [mode],
    );
  } catch {
    // Fallback: at least memory is set
  }
  await logPlatformEvent({event: 'diagnostic_mode_changed', detail: {new_mode: mode}});
}

function isModeB(): boolean {
  return getDiagnosticMode() === 'B';
}

// --- Sequence counter (persisted) ---

async function getNextSeq(): Promise<number> {
  try {
    const db = await getDatabase();
    const [result] = await db.executeSql('SELECT MAX(seq) as maxSeq FROM event_timeline');
    const current = result.rows.item(0).maxSeq || 0;
    return current + 1;
  } catch {
    return Date.now(); // Fallback
  }
}

// --- Event Timeline Logger (event-timeline.jsonl) ---

export interface EventTimelineEntry {
  ts: string;
  seq: number;
  event: string;
  source?: string;
  package_or_sender?: string;
  detail?: Record<string, unknown>;
  raw_text?: string;
}

export async function logTimelineEvent(entry: {
  event: string;
  source?: string;
  package_or_sender?: string;
  detail?: Record<string, unknown>;
  raw_text?: string;
}): Promise<void> {
  if (!isModeB()) return;

  try {
    const db = await getDatabase();
    const seq = await getNextSeq();
    await db.executeSql(
      'INSERT INTO event_timeline (ts, seq, event, source, package_or_sender, detail, raw_text) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        new Date().toISOString(),
        seq,
        entry.event,
        entry.source || null,
        entry.package_or_sender || null,
        entry.detail ? JSON.stringify(entry.detail) : null,
        entry.raw_text || null,
      ],
    );
  } catch {
    // Silent failure — don't break pipeline for diagnostic logging
  }
}

/**
 * Log a discard event. Per privacy rule: no non-financial raw text stored.
 * Only timestamp, source, and reason.
 */
export async function logDiscardEvent(entry: {
  source: string;
  package_or_sender: string;
  reason: string;
}): Promise<void> {
  if (!isModeB()) return;

  try {
    const db = await getDatabase();
    const seq = await getNextSeq();
    await db.executeSql(
      'INSERT INTO event_timeline (ts, seq, event, source, package_or_sender, detail) VALUES (?, ?, ?, ?, ?, ?)',
      [
        new Date().toISOString(),
        seq,
        'source_discarded',
        entry.source,
        entry.package_or_sender,
        JSON.stringify({reason: entry.reason}),
      ],
    );
  } catch {}
}

// --- Decision Trace Logger (decision-trace.jsonl) ---

export interface DecisionTraceEntry {
  ts: string;
  function_name: string;
  inputs: Record<string, unknown>;
  output: Record<string, unknown>;
  score?: number;
  exclusion_reason?: string;
}

export async function logDecision(entry: {
  function_name: string;
  inputs: Record<string, unknown>;
  output: Record<string, unknown>;
  score?: number;
  exclusion_reason?: string;
}): Promise<void> {
  if (!isModeB()) return;

  try {
    const db = await getDatabase();
    await db.executeSql(
      'INSERT INTO decision_trace (ts, function_name, inputs, output, score, exclusion_reason) VALUES (?, ?, ?, ?, ?, ?)',
      [
        new Date().toISOString(),
        entry.function_name,
        JSON.stringify(entry.inputs),
        JSON.stringify(entry.output),
        entry.score ?? null,
        entry.exclusion_reason || null,
      ],
    );
  } catch {}
}

// --- Platform Trace Logger (platform-trace.jsonl) ---

export interface PlatformTraceEntry {
  ts: string;
  event: string;
  detail?: Record<string, unknown>;
}

export async function logPlatformEvent(entry: {
  event: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  // Platform events always logged (both Mode A and B) — critical for T2/T11/T12
  try {
    const db = await getDatabase();
    await db.executeSql(
      'INSERT INTO platform_trace (ts, event, detail) VALUES (?, ?, ?)',
      [
        new Date().toISOString(),
        entry.event,
        entry.detail ? JSON.stringify(entry.detail) : null,
      ],
    );
  } catch {}
}

// --- Build Manifest Generator (manifest.json) ---

export interface BuildManifest {
  build_id: string;
  flavor: 'playstore' | 'sideload';
  version_name: string;
  version_code: number;
  diagnostic_mode: DiagnosticMode;
  tester_alias: string;
  device_model: string;
  android_version: string;
  milestone: string;
  start_time: string;
  end_time: string;
  date_range: string;
}

export function generateManifest(params: {
  build_id: string;
  flavor: 'playstore' | 'sideload';
  version_name: string;
  version_code: number;
  tester_alias: string;
  device_model: string;
  android_version: string;
  milestone: string;
  start_time: string;
}): BuildManifest {
  return {
    build_id: params.build_id,
    flavor: params.flavor,
    version_name: params.version_name,
    version_code: params.version_code,
    diagnostic_mode: getDiagnosticMode(),
    tester_alias: params.tester_alias,
    device_model: params.device_model,
    android_version: params.android_version,
    milestone: params.milestone,
    start_time: params.start_time,
    end_time: new Date().toISOString(),
    date_range: `${params.start_time} to ${new Date().toISOString()}`,
  };
}

// --- Evidence Export (reads from SQLite) ---

export interface EvidenceBundle {
  manifest: BuildManifest;
  eventTimeline: string;
  decisionTrace: string;
  platformTrace: string;
}

function rowsToJsonl(rows: any): string {
  const lines: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows.item(i);
    const obj: Record<string, unknown> = {};
    for (const key of Object.keys(row)) {
      if (key === 'id') continue;
      if ((key === 'detail' || key === 'inputs' || key === 'output') && row[key]) {
        try { obj[key] = JSON.parse(row[key]); } catch { obj[key] = row[key]; }
      } else {
        obj[key] = row[key];
      }
    }
    lines.push(JSON.stringify(obj));
  }
  return lines.join('\n');
}

export async function exportEvidenceBundle(manifestParams: {
  build_id: string;
  flavor: 'playstore' | 'sideload';
  version_name: string;
  version_code: number;
  tester_alias: string;
  device_model: string;
  android_version: string;
  milestone: string;
  start_time: string;
}): Promise<EvidenceBundle> {
  const manifest = generateManifest(manifestParams);
  const db = await getDatabase();

  const [timeline] = await db.executeSql('SELECT * FROM event_timeline ORDER BY seq ASC');
  const [decisions] = await db.executeSql('SELECT * FROM decision_trace ORDER BY ts ASC');
  const [platform] = await db.executeSql('SELECT * FROM platform_trace ORDER BY ts ASC');

  return {
    manifest,
    eventTimeline: rowsToJsonl(timeline.rows),
    decisionTrace: rowsToJsonl(decisions.rows),
    platformTrace: rowsToJsonl(platform.rows),
  };
}

/**
 * Purge all evidence after export.
 */
export async function purgeEvidence(): Promise<void> {
  try {
    const db = await getDatabase();
    await db.executeSql('DELETE FROM event_timeline');
    await db.executeSql('DELETE FROM decision_trace');
    await db.executeSql('DELETE FROM platform_trace');
  } catch {}
}

// --- Accessors for testing/UI ---

export async function getEventTimeline(): Promise<EventTimelineEntry[]> {
  try {
    const db = await getDatabase();
    const [result] = await db.executeSql('SELECT * FROM event_timeline ORDER BY seq ASC');
    const entries: EventTimelineEntry[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      entries.push({
        ts: row.ts,
        seq: row.seq,
        event: row.event,
        source: row.source,
        package_or_sender: row.package_or_sender,
        detail: row.detail ? JSON.parse(row.detail) : undefined,
        raw_text: row.raw_text,
      });
    }
    return entries;
  } catch {
    return [];
  }
}

export async function getDecisionTrace(): Promise<DecisionTraceEntry[]> {
  try {
    const db = await getDatabase();
    const [result] = await db.executeSql('SELECT * FROM decision_trace ORDER BY ts ASC');
    const entries: DecisionTraceEntry[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      entries.push({
        ts: row.ts,
        function_name: row.function_name,
        inputs: JSON.parse(row.inputs),
        output: JSON.parse(row.output),
        score: row.score,
        exclusion_reason: row.exclusion_reason,
      });
    }
    return entries;
  } catch {
    return [];
  }
}

export async function getPlatformTrace(): Promise<PlatformTraceEntry[]> {
  try {
    const db = await getDatabase();
    const [result] = await db.executeSql('SELECT * FROM platform_trace ORDER BY ts ASC');
    const entries: PlatformTraceEntry[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      entries.push({
        ts: row.ts,
        event: row.event,
        detail: row.detail ? JSON.parse(row.detail) : undefined,
      });
    }
    return entries;
  } catch {
    return [];
  }
}

export async function getEventCount(): Promise<number> {
  try {
    const db = await getDatabase();
    const [result] = await db.executeSql('SELECT COUNT(*) as cnt FROM event_timeline');
    return result.rows.item(0).cnt;
  } catch {
    return 0;
  }
}
