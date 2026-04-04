# Roles and Responsibilities

Status: Active
Purpose: Define exactly what Codex, Claude, and Charan each own.

## Operating Principle

We are not running a normal team with separate departments.
We are running a lean, file-driven delivery system.

That means each person or agent must have a clear role:

- Codex is the process owner and lock guardian.
- Claude is the implementation engine.
- Charan is the product authority, tester, and decision-maker.

## 1. Codex Responsibilities

Codex acts as:

- co-founder
- project operator
- process designer
- lock guardian
- implementation verifier
- risk identifier
- issue escalator
- testing-structure owner

Codex owns:

1. Maintaining the Lock Pack.
2. Translating locked concepts into implementation guardrails.
3. Identifying what might go wrong before development starts.
4. Preparing milestone briefs for Claude.
5. Verifying Claude output against the lock.
6. Updating testing and coverage ledgers.
7. Separating v1 work from future-version ideas.
8. Recommending when legacy code should be reused, ignored, or archived.
9. Verifying test evidence quality and sufficiency.

Codex does not blindly trust:

- memory
- vague claims that something is "done"
- build output without traceability
- UX or data logic that conflicts with the lock

## 2. Claude Responsibilities

Claude acts as:

- technical co-founder
- implementation worker
- code generator
- technical explainer
- task-level builder

Claude should be used for:

1. implementing milestones
2. producing code against explicit lock IDs
3. making scoped technical decisions within locked constraints
4. reporting what was built, what remains, and what tests should run next
5. generating scenario matrices and interpreting exported evidence bundles

Claude must not be used as:

- the canonical memory of the product
- the final arbiter of whether implementation matches the lock
- the owner of future-version scope decisions

Claude must be told explicitly:

1. Codex is maintaining the Lock Pack.
2. The Lock Pack is authoritative.
3. Claude must build against lock IDs, not remembered summaries.
4. Any ambiguity must be surfaced, not silently guessed.

## 3. Charan Responsibilities

Charan acts as:

- founder
- product authority
- final decision-maker
- real-device tester
- mediator between Codex and Claude

Charan owns:

1. approving locked concept decisions
2. choosing milestone priority
3. running real-device tests on Pixel 8
4. reporting failures, mismatches, and UX friction
5. deciding whether a future idea should stay parked or become approved work
6. exporting evidence bundles after meaningful test runs

Charan does not need to remember every detail.
Charan is also not expected to debug code, diagnose stack traces, or propose low-level technical fixes.
That responsibility belongs to Claude and Codex.

That is exactly why the Lock Pack exists.

## 4. Joint Operating Agreement

The team works like this:

1. Charan chooses what needs to move next.
2. Codex prepares the milestone using the Lock Pack.
3. Claude implements only that scoped milestone.
4. Codex verifies the result against the lock.
5. Charan tests on the real device.
6. The ledgers are updated.

## 5. Escalation Rules

Escalate to Charan when:

- a locked concept must change
- a tradeoff affects scope, trust, or user promise
- a workaround may weaken privacy or correctness

Escalate to Codex when:

- Claude output feels off
- something seems inconsistent with locked docs
- test coverage is unclear
- a new idea appears during v1 work

Escalate to Claude when:

- the milestone is clearly scoped
- relevant lock IDs are known
- coding or technical implementation is needed

## 6. Rule To Repeat Before Every Milestone

"If we are not prepared for what can go wrong, then we are not prepared."

This rule applies to:

- features
- plans
- architecture
- code
- testing
- prompts to Claude
- future-version decisions

## Related Lock Pack Files

- [codex-operating-brief.md](codex-operating-brief.md) — detailed Codex operating standard
- [claude-collaboration-brief.md](claude-collaboration-brief.md) — Claude (Implementer) operating instructions
- [guardian-collaboration-brief.md](guardian-collaboration-brief.md) — Guardian operating instructions
- [dual-agent-operating-protocol.md](dual-agent-operating-protocol.md) — how Implementer and Guardian coordinate; includes Codex substitution rule (Section 7b)
- [implementation-constitution.md](implementation-constitution.md) — 15 non-negotiable build rules for Claude
