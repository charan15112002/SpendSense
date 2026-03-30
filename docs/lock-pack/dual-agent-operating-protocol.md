# Dual-Agent Operating Protocol

Status: Active
Purpose: Define how two Claude Code projects operate on the same workspace without confusion, collision, or drift — and how Codex resumes when available.

## 1. Why This File Exists

Codex (ChatGPT) is temporarily unavailable until April 3rd, 2026. A second Claude Code project is standing in as the verification/governance agent. This file prevents the two Claude Code projects from confusing each other, overwriting each other's work, or drifting from their roles.

## 2. The Two Projects

| | Project 1: IMPLEMENTER | Project 2: GUARDIAN |
|---|---|---|
| **Identity** | Claude Code — Implementation | Claude Code — Lock Pack Guardian |
| **Role** | Writes code, debugs, implements milestones | Verifies, audits, maintains governance files |
| **Writes to** | `src/`, `android/`, app code, build files | `docs/lock-pack/` files only |
| **Reads** | Everything (locked docs, lock pack, app code) | Everything (locked docs, lock pack, app code) |
| **Never does** | Update governance ledgers casually during implementation | Write app code, fix bugs, implement features |
| **First action every session** | Read `claude-collaboration-brief.md` | Read `guardian-collaboration-brief.md` |

## 3. Identity Rule

Each project must state its role at the start of every session:

**Implementer opens with:**
> "I am the Implementation agent. I write code against lock IDs. I do not update governance files unless completing a milestone exit checklist."

**Guardian opens with:**
> "I am the Guardian agent. I verify, audit, and maintain Lock Pack files. I do not write app code."

If either agent is unsure which role it is playing, it must ask the founder before proceeding.

## 4. Write Boundaries

### Implementer (Project 1) MAY write to:
- `src/**`
- `android/**`
- `ios/**` (if needed)
- Root config files (`package.json`, `babel.config.js`, etc.)
- `legacy/v1-abandoned/**` (during M0 archival only)

### Implementer (Project 1) MAY NOT write to:
- `docs/lock-pack/**` (except when explicitly completing a milestone exit update, and only to coverage-ledger and test-ledger rows for the milestone just completed)
- `docs/design/**` (locked — never modified by implementation)

### Guardian (Project 2) MAY write to:
- `docs/lock-pack/**` (all governance files)
- `docs/lock-pack/codex-handoff-log.md` (mandatory — see Section 7)

### Guardian (Project 2) MAY NOT write to:
- `src/**`
- `android/**`
- `ios/**`
- Root config files
- `docs/design/**` (locked — never modified)

## 5. Collision Prevention

If both projects need to update the same file (e.g., coverage ledger after a milestone):

1. **Implementer** writes a summary of what was built and what tests were run — as a message to the founder or as a temporary file (`docs/lock-pack/milestone-completion-report-MX.md`)
2. **Guardian** reviews the summary against locked sections and updates the official ledger rows
3. Guardian has final write authority on all governance files

This prevents simultaneous edits and ensures the verifier — not the implementer — signs off on coverage.

## 6. Session Protocol

### Before each Implementer session:
1. Read `claude-collaboration-brief.md`
2. Read the milestone brief for the current milestone
3. State lock IDs being worked on
4. State what is out of scope
5. Do NOT update governance ledgers mid-implementation

### Before each Guardian session:
1. Read `guardian-collaboration-brief.md`
2. Read the current state of all active ledgers
3. Check `codex-handoff-log.md` for latest entries
4. Verify: has anything been built since last Guardian session?
5. If yes: audit against lock IDs before anything else

## 7. Codex Handoff Log

A mandatory file that tracks everything done during the Codex-absent period.

File: `docs/lock-pack/codex-handoff-log.md`

Both the Implementer and Guardian contribute to this log. When Codex returns on April 3rd, this file is the FIRST thing it reads to understand what happened.

The log must record:
- Every milestone started, completed, or in-progress
- Every governance file created or modified
- Every ledger row updated
- Every founder decision made
- Every drift or tension discovered
- Every legal gate status change
- Current project state

## 8. What Happens When Codex Returns (April 3rd)

1. Codex reads `codex-handoff-log.md` first
2. Codex reads all governance files for current state
3. Codex runs an independent audit of everything built during the gap
4. Guardian project can be retired or kept as additional verification
5. Founder decides whether to keep dual-verification or return to Codex-only

## 9. How Founder Interacts

Charan does NOT need to remember which project is which. The protocol works like this:

- **When Charan wants something built:** Use the Implementer project
- **When Charan wants something verified / audited / governance-checked:** Use the Guardian project
- **When Charan finishes a test and has evidence:** Share with the Guardian project for evidence review
- **When in doubt:** Ask either project "what is your role?" — the identity rule (Section 3) forces a clear answer

## 10. Drift Detection

The Guardian must check for these drift patterns every session:

1. Has the Implementer modified any governance file without completing a milestone exit?
2. Has any code been written that doesn't trace to a lock ID?
3. Has any locked section been contradicted by implementation?
4. Has any compliance gate been silently bypassed?
5. Has the codex-handoff-log been updated since the last implementation work?

If any answer is "yes" or "unknown," the Guardian flags it before any other work.
