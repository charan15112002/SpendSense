# Legacy Code Disposition

Status: Active
Purpose: Decide how to handle the earlier failed-version app files still present in the workspace.

## Current Reality

The old failed-version app code is still present in:

- `src/`
- `android/`
- `ios/`
- existing app root files

This code has historical value, but it is not trustworthy as source-of-truth product logic.

## Risks If We Leave It Unmanaged

1. Claude may read old implementation and assume it reflects the locked concept.
2. Old UX and logic may silently leak into the rebuild.
3. Legacy service files may bias architecture toward earlier mistakes.
4. Without git, accidental overwrites or mixed-generation code become harder to recover from.

## Policy

The old code should be treated as:

- reference material only
- not canonical product logic
- not safe to build on blindly

## Recommended Path

### Option A: Clean Rebuild In Place

Use the current workspace, but rebuild milestone by milestone while explicitly ignoring old product assumptions.

Pros:

- fastest path
- no directory relocation needed right now

Cons:

- higher contamination risk from legacy files

### Option B: Archive Legacy Code And Rebuild In A Clean App Workspace

Create a clean app workspace or move legacy implementation into a clearly marked archive area first.

Suggested archive target:

- `legacy/v1-abandoned/`

Pros:

- lowest contamination risk
- cleanest mental model
- easiest for Claude to avoid old assumptions

Cons:

- small upfront file-organization effort

## My Recommendation

Choose Option B before serious implementation begins.

That means:

1. keep `docs/design/` and `docs/lock-pack/` as the product truth
2. archive the old failed-version app code into a clearly named legacy area, or move the new rebuild into a clean workspace
3. start the rebuild from the lock, not from old services

## Reuse Rule

Legacy code may only be reused if all three are true:

1. the code is reviewed against the locked sections
2. the relevant lock IDs are identified
3. Codex explicitly agrees the code is reusable

If those three conditions are not met, legacy code is treated as suspect by default.

## Immediate Next Decision Needed

Before major implementation work:

- either archive old app code
- or create a clean rebuild workspace

Do not start major milestone coding until this is decided.
