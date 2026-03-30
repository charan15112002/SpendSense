# Milestone Brief: M0 Workspace Stabilization

Status: Active
Purpose: First implementation milestone brief derived from Section 10 and the Lock Pack.

## 1. Milestone Identity

- Milestone: `M0`
- Name: `Workspace Stabilization`
- Type: governance + workspace milestone

## 2. Canonical Sources

Read before doing anything:

- [section-10-milestones.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\design\section-10-milestones.md)
- [workspace-governance.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\workspace-governance.md)
- [legacy-code-disposition.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\legacy-code-disposition.md)
- [milestone-preflight-checklist.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\milestone-preflight-checklist.md)
- [risk-register.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\risk-register.md)
- [build-iteration-control.md](C:\Users\Charan\Desktop\SpendSense - Copy\docs\lock-pack\build-iteration-control.md)

## 3. Milestone Goal

Make the workspace safe enough to begin real implementation.

This milestone does **not** build product features.

## 4. Lock Intent

M0 must satisfy Section 10 exactly:

1. initialize git repository in project root
2. decide legacy code disposition
3. verify Lock Pack files are complete and internally consistent
4. verify all 11 design section files are present and locked
5. clean project structure enough that future implementation does not inherit failed-version assumptions

## 5. In Scope

- git initialization
- creation of `legacy/v1-abandoned/`
- archival of failed-version implementation
- preservation of locked docs
- clean workspace preparation
- minimal notes if path or structure changes

## 6. Out Of Scope

- new app features
- bug fixes in old app
- reuse decisions for legacy code internals
- UI redesign
- database redesign
- native module implementation
- build flavor work

## 7. Success Criteria

M0 is done only when all are true:

- `git rev-parse --is-inside-work-tree` succeeds
- old app implementation is no longer living in active build paths as canonical code
- `docs/design/` remains intact
- `docs/lock-pack/` remains intact
- live workspace no longer invites Claude to treat failed-version code as source of truth

## 8. Known Risks

- R-02 legacy contamination
- R-15 no git history

## 9. Fallback

If archival in place becomes too messy:

- pause
- preserve docs
- create a clean rebuild workspace
- migrate only the locked docs and Lock Pack

## 10. Founder Role

Charan only needs to approve:

- archival path
- whether we proceed in-place or via a clean rebuild workspace

No code debugging is expected from Charan here.

## 11. Recommended Execution Order

1. verify docs untouched
2. initialize git
3. create archive target
4. move legacy code
5. verify clean structure
6. record result

## 12. Expected Result

After M0, SpendSense will be ready for the first real build milestone.
