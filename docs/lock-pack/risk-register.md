# Risk Register

Status: Active
Purpose: Track what can go wrong before, during, and after implementation.

## Rule

This file must be reread before:

- locking a major design section
- starting a new build milestone
- accepting Claude implementation output
- running a major test cycle

## Core Risks

| Risk ID | Risk | Why It Matters | Likelihood | Impact | Prevention | Fallback |
|---|---|---|---|---|---|---|
| R-01 | Claude builds from memory instead of lock files | Causes concept drift and silent mistakes | High | High | Always require lock IDs and lock-file citations | Reject output and re-brief from Lock Pack |
| R-02 | Legacy code contaminates rebuild | Old failed assumptions leak into new implementation | High | High | Archive old code or isolate it before serious coding | Treat reused code as suspect and re-verify against lock |
| R-03 | Play and sideload architectures get mixed | Creates broken permissions and false assumptions | Medium | High | Keep build flavors explicit from the start | Re-split architecture before UI polish |
| R-04 | Money model implemented partially | Totals and categories become untrustworthy | Medium | High | Build the 6-axis model first, before UI richness | Stop later milestones until model is corrected |
| R-05 | Quarantined or low-confidence items leak into totals | Breaks trust immediately | Medium | High | Keep confidence and quarantine logic central, not cosmetic | Add exclusion guards and test all summary paths |
| R-06 | Credit card bill payment gets double-counted | Creates wrong spend picture | Medium | High | Build liability ledger before money surfaces | Block release until card logic passes tests |
| R-07 | Self-transfers get shown as spend | Core finance truth breaks | Medium | High | Build identity graph before transfer intelligence | Force manual confirmation until identity graph works |
| R-08 | Prompting becomes spammy or ineffective | Learning loop dies | High | High | Respect smart-notification defaults, batching, and caps | Reduce prompt frequency and rely on in-app queue |
| R-09 | Privacy wording overpromises | Trust damage and design/code mismatch | Medium | High | Keep wording tied to technical truth | Correct copy before release |
| R-10 | AI becomes a hidden dependency | App feels broken without internet or provider | Medium | High | Preserve AI-off functionality in every milestone | Disable AI-assisted layer without breaking core use |
| R-11 | Platform limits are ignored in UX | User sees silent failure | Medium | High | Build warning states and fallback modes early | Show explicit degraded/unsupported states |
| R-12 | Testing is delayed until the end | Rework becomes expensive and confusing | High | High | Update test ledger alongside design and code | Stop new feature work until tests catch up |
| R-13 | Future-version ideas creep into v1 | Scope bloats and quality drops | High | Medium | Park all non-v1 ideas in future-version register | Remove drift and re-scope milestone |
| R-14 | One-device testing creates blind spots | Some OEM/device issues remain unknown | High | Medium | Design for testability and preserve field-test unknowns | Ship with honest constraints and expand testing later |
| R-15 | No git history during rebuild | Harder rollback and milestone isolation | Medium | High | Initialize git before major code generation if possible | Use archived snapshots and docs as emergency recovery |

## Risk Review Questions

Before any milestone, ask:

1. What can go wrong technically?
2. What can go wrong conceptually?
3. What can go wrong in UX trust?
4. What can go wrong because of our limited resources?
5. What is the fallback if the happy path fails?

If those questions are not answered, the milestone is not fully prepared.
