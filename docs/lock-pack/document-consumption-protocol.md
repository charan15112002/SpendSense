# Document Consumption Protocol

Status: Active
Purpose: Prevent important locked concepts from being missed when a file is too long to read in one pass.

## 1. Problem

Long design files may exceed tool token limits.
If a coding assistant stops after one chunk and assumes it has read enough, it can miss lock-critical details.

This protocol exists so reading remains complete and auditable.

## 2. Core Rule

If a relevant file cannot be read in one pass, it must be read in chunks until coverage is complete.

Partial reading is allowed only when:

- the exact subsection needed is known
- the skipped sections are explicitly named as out of scope

## 3. Required Reading Sequence for Long Files

For any long locked document:

1. read the header and status
2. identify major section headings
3. read the file in numbered chunks until the relevant scope is covered
4. record which chunks or sections were read
5. cross-check with traceability matrix, constraint ledger, and compliance ledger if the task touches those areas

## 4. Chunk-Coverage Rule

When chunking is used, the reader must be able to say:

- which file was chunked
- which offsets or sections were read
- which sections were relevant
- which sections were intentionally skipped
- why the skipped sections were safe to skip

If that cannot be stated, the read is incomplete.

## 5. Required Behavior for Claude

Before coding against long docs, Claude must:

1. state the file paths read
2. state the sections or chunks read
3. state what is out of scope
4. stop if a token-limit warning prevents full relevant coverage

Claude must not say "I have everything needed" unless the relevant locked parts were actually covered.

## 6. Required Behavior for Codex

Codex must:

- verify that the files cited by Claude are actually sufficient
- catch missing dependency sections
- use ledgers and traceability files as a second reading layer

## 7. Reading Aids

Use these files as compression layers, not replacements for locked docs:

- `requirements-traceability-matrix.md`
- `constraint-resolution-ledger.md`
- `compliance-ledger.md`
- `implementation-coverage-ledger.md`
- `test-ledger.md`

These files help narrow what must be read, but they do not overrule locked source text.

## 8. Implementation Prompt Rule

For every milestone prompt, require the coding assistant to list:

- locked source files read
- lock IDs being implemented
- any long file that was read in chunks

## 9. Mandatory Rules

- Token-limit warnings are not an excuse to stop reading.
- Long-file reading must be chunked deliberately.
- Relevant skipped sections must be named, not assumed away.
- Traceability files compress scope but do not replace locked docs.
