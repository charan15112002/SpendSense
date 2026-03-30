# Workspace Governance

Status: Active
Purpose: Define how the shared workspace should be used by Codex and Claude.

## 1. Shared Workspace Principle

Both Codex and Claude use the same workspace.
That means folder meaning must be explicit.

No one should guess what a folder is for.

## 2. Folder Roles

### `docs/design/`

Purpose:
Locked concept documents and recovered source-of-truth design sections.

Rules:

- only update if a concept is intentionally changed or a verified wording mismatch must be corrected
- not for implementation notes
- not for future ideas

### `docs/lock-pack/`

Purpose:
Operational system for implementing the locked concepts safely.

Rules:

- Codex-owned
- Claude reads this folder before implementation work
- this folder tracks build order, coverage, tests, and future scope separation

### `src/`, `android/`, `ios/`, app code folders

Purpose:
Implementation only.

Rules:

- Claude can build here only against scoped milestone briefs
- no silent architecture changes
- no future-version features without approval

## 3. Prompt Rule For Claude

Before Claude codes, Claude must be told to read:

- relevant locked section files in `docs/design/`
- `docs/lock-pack/implementation-constitution.md`
- `docs/lock-pack/requirements-traceability-matrix.md`
- `docs/lock-pack/test-ledger.md`

Claude must not treat old app code as the product truth.

## 4. File Ownership

Codex-owned:

- `docs/lock-pack/*`
- recovery verification work
- alignment verification

Shared but lock-controlled:

- `docs/design/*`

Claude-owned during implementation tasks:

- app code files touched by the current milestone

Founder-owned:

- final approval of lock changes
- test outcomes on real device

## 5. Current Repo Reality

Important current fact:

- the workspace is not currently a git repository

Implication:

- we cannot safely rely on git history yet for milestone isolation or rollback

Recommendation:

- before serious code generation begins, initialize a git repo or create a clean repo copy
- do this only after we decide what to do with legacy failed-version code

## 6. Naming Rule

Any new operational file should go into `docs/lock-pack/`.
Any new concept file should go into `docs/design/`.
Any future-version feature note should go into `docs/lock-pack/future-version-register.md`, not random markdown files.
