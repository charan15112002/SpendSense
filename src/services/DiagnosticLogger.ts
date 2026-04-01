/**
 * Diagnostic Evidence Capture System (Lock IDs: test-evidence-capture-plan, evidence-bundle-contract)
 *
 * Mode A: Normal release logging — minimal operational logging, no verbose timeline
 * Mode B: Founder diagnostic mode — full event timeline, decision traces, platform traces
 *
 * Evidence stays on-device until manually exported (no background upload).
 * Non-financial raw content is NOT stored — only timestamp, source, and reason for discards.
 *
 * Bundle components (evidence-bundle-contract.md Section 2):
 *   - manifest.json
 *   - event-timeline.jsonl
 *   - decision-trace.jsonl
 *   - platform-trace.jsonl
 */

// --- Diagnostic Mode Toggle ---

export type DiagnosticMode = 'A' | 'B';

let currentMode: DiagnosticMode = __DEV__ ? 'B' : 'A';

export function getDiagnosticMode(): DiagnosticMode {
  return currentMode;
}

export function setDiagnosticMode(mode: DiagnosticMode): void {
  currentMode = mode;
  logPlatformEvent({
    event: 'diagnostic_mode_changed',
    detail: {new_mode: mode},
  });
}

function isModeB(): boolean {
  return currentMode === 'B';
}

// --- In-Memory Log Storage ---
// Stored in memory, flushed to JSONL on export.

const eventTimeline: EventTimelineEntry[] = [];
const decisionTrace: DecisionTraceEntry[] = [];
const platformTrace: PlatformTraceEntry[] = [];

// --- Event Timeline Logger (event-timeline.jsonl) ---

export interface EventTimelineEntry {
  ts: string; // ISO 8601
  seq: number;
  event: string;
  source?: string;
  package_or_sender?: string;
  detail?: Record<string, unknown>;
}

let eventSeq = 0;

export function logTimelineEvent(entry: {
  event: string;
  source?: string;
  package_or_sender?: string;
  detail?: Record<string, unknown>;
}): void {
  if (!isModeB()) return;

  eventTimeline.push({
    ts: new Date().toISOString(),
    seq: ++eventSeq,
    event: entry.event,
    source: entry.source,
    package_or_sender: entry.package_or_sender,
    detail: entry.detail,
  });
}

/**
 * Log a discard event. Per privacy rule: no non-financial raw text stored.
 * Only timestamp, source, and reason.
 */
export function logDiscardEvent(entry: {
  source: string;
  package_or_sender: string;
  reason: string;
}): void {
  if (!isModeB()) return;

  eventTimeline.push({
    ts: new Date().toISOString(),
    seq: ++eventSeq,
    event: 'source_discarded',
    source: entry.source,
    package_or_sender: entry.package_or_sender,
    detail: {reason: entry.reason},
  });
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

export function logDecision(entry: {
  function_name: string;
  inputs: Record<string, unknown>;
  output: Record<string, unknown>;
  score?: number;
  exclusion_reason?: string;
}): void {
  if (!isModeB()) return;

  decisionTrace.push({
    ts: new Date().toISOString(),
    function_name: entry.function_name,
    inputs: entry.inputs,
    output: entry.output,
    score: entry.score,
    exclusion_reason: entry.exclusion_reason,
  });
}

// --- Platform Trace Logger (platform-trace.jsonl) ---

export interface PlatformTraceEntry {
  ts: string;
  event: string;
  detail?: Record<string, unknown>;
}

export function logPlatformEvent(entry: {
  event: string;
  detail?: Record<string, unknown>;
}): void {
  // Platform events are always logged (both Mode A and B)
  // These are critical for diagnosing listener survival (T2, T11, T12)
  platformTrace.push({
    ts: new Date().toISOString(),
    event: entry.event,
    detail: entry.detail,
  });
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
    diagnostic_mode: currentMode,
    tester_alias: params.tester_alias,
    device_model: params.device_model,
    android_version: params.android_version,
    milestone: params.milestone,
    start_time: params.start_time,
    end_time: new Date().toISOString(),
    date_range: `${params.start_time} to ${new Date().toISOString()}`,
  };
}

// --- Evidence Export ---

export interface EvidenceBundle {
  manifest: BuildManifest;
  eventTimeline: string; // JSONL
  decisionTrace: string; // JSONL
  platformTrace: string; // JSONL
}

function toJsonl(entries: Array<Record<string, unknown>>): string {
  return entries.map(e => JSON.stringify(e)).join('\n');
}

/**
 * Export evidence bundle — all 4 mandatory components per evidence-bundle-contract.md.
 * Returns the bundle as structured data. The caller handles saving to Downloads or share sheet.
 */
export function exportEvidenceBundle(manifestParams: {
  build_id: string;
  flavor: 'playstore' | 'sideload';
  version_name: string;
  version_code: number;
  tester_alias: string;
  device_model: string;
  android_version: string;
  milestone: string;
  start_time: string;
}): EvidenceBundle {
  const manifest = generateManifest(manifestParams);

  return {
    manifest,
    eventTimeline: toJsonl(eventTimeline as unknown as Array<Record<string, unknown>>),
    decisionTrace: toJsonl(decisionTrace as unknown as Array<Record<string, unknown>>),
    platformTrace: toJsonl(platformTrace as unknown as Array<Record<string, unknown>>),
  };
}

/**
 * Purge all in-memory evidence after export.
 * Per evidence-bundle-contract.md: evidence must be purgeable from device after export.
 */
export function purgeEvidence(): void {
  eventTimeline.length = 0;
  decisionTrace.length = 0;
  platformTrace.length = 0;
  eventSeq = 0;
}

// --- Accessors for testing ---

export function getEventTimeline(): ReadonlyArray<EventTimelineEntry> {
  return eventTimeline;
}

export function getDecisionTrace(): ReadonlyArray<DecisionTraceEntry> {
  return decisionTrace;
}

export function getPlatformTrace(): ReadonlyArray<PlatformTraceEntry> {
  return platformTrace;
}
