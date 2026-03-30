# Founder Relay Guide

Status: Active
Purpose: Give Charan a zero-effort way to ensure both agents follow their protocols every time.

## Why This Exists

Both the Implementer and Guardian are Claude Code projects. They do not carry memory across sessions. If you paste a message without a protocol trigger, they may respond without reading their governance files first. This guide prevents that.

## What To Do Every Time

### When pasting a message TO the Implementer:

Add this line at the TOP of every message, before the actual content:

```
Read docs/lock-pack/claude-collaboration-brief.md and docs/lock-pack/implementation-constitution.md before responding. Follow all protocols. Then read the message below.
```

### When pasting a message TO the Guardian:

Add this line at the TOP of every message, before the actual content:

```
Read docs/lock-pack/guardian-session-protocol.md and docs/lock-pack/guardian-collaboration-brief.md before responding. Follow all protocols. Then read the message below.
```

### When starting a NEW session with either agent:

Use the same lines above. The agent will read its files and re-establish context before doing anything.

## That's It

You do not need to remember any details about protocols, lock IDs, or verification steps. The files contain everything. Your only job is to paste the trigger line so the agent reads its files.

## What If An Agent Responds Without Following Protocol?

If either agent gives a response that doesn't start with its identity statement or doesn't reference its protocol files, paste this:

```
You did not follow your session protocol. Read your collaboration brief and protocol files before responding.
```

## Codex Handoff Note

Everything that happens between Guardian, Implementer, and Charan is recorded in `codex-handoff-log.md`. Guardian is responsible for keeping this log current. Charan does not need to maintain it separately.
