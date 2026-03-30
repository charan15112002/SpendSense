# Document Management System

Status: Active
Purpose: Keep the growing design and Lock Pack document set usable as the project scales.

## 1. Core Principle

More files are acceptable if they reduce ambiguity.
More files become a problem only when retrieval and ownership are unclear.

This system exists to keep the document set navigable and stable.

## 2. Document Layers

### Layer A: Canonical Product Truth

Location:

- `docs/design/`

Examples:

- Section 1 through Section 11

Rule:

- these define what the product is

### Layer B: Operational Governance

Location:

- `docs/lock-pack/`

Examples:

- constitution
- workflow
- ledgers
- risk rules
- compliance rules

Rule:

- these define how we build and verify the product

### Layer C: Execution Artifacts

Location:

- `docs/lock-pack/builds/`
- `docs/lock-pack/test-runs/`

Examples:

- build manifests
- test evidence bundles
- run notes

Rule:

- these describe what actually happened during implementation and testing

## 3. Retrieval Rule

When answering a question or scoping work:

1. start from the relevant design section
2. narrow using the traceability matrix or ledgers
3. read the operational governance files that affect the task
4. use execution artifacts only after the above

## 4. File-Creation Rule

Add a new file only if one of these is true:

- a repeated process needs to be standardized
- a risk needs a permanent control
- evidence or artifacts need a stable home
- an existing file would become confusing if overloaded

Do not create files for one-off thoughts.

## 5. Naming Rule

Use descriptive, stable names.

Good:

- `test-evidence-capture-plan.md`
- `build-iteration-control.md`

Bad:

- `notes2.md`
- `misc-process.md`

## 6. Count Rule

Do not hardcode fixed file counts in design or process docs.

Use language like:

- active Lock Pack files
- current Lock Pack files

Reason:

- file counts change as governance matures

## 7. Index Rule

`docs/lock-pack/README.md` is the top-level index.

Any new operational file should be added there promptly.

## 8. Archive Rule

If a process file becomes obsolete:

- do not quietly leave it misleading
- mark it superseded or update it
- if needed, move it to an archive area later

## 9. Mandatory Rules

- Design docs define the product.
- Lock Pack docs define the process.
- Build and test artifact folders define the evidence.
- The README index must stay current.
- Fixed file counts should not appear in evolving process docs.
