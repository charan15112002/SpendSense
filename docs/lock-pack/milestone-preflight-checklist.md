# Milestone Preflight Checklist

Status: Active
Purpose: Force preparation before building anything.

Use this checklist before every new implementation milestone.

## Preflight

- The milestone has a clear name.
- The relevant lock IDs are identified.
- The relevant source files in `docs/design/` have been reread.
- The relevant rows in the traceability matrix have been reviewed.
- The relevant rows in the coverage ledger are known.
- The relevant tests in the test ledger are known.
- The relevant release-track and flavor rules are known.
- The intended evidence-capture mode is chosen.
- The build ID / artifact naming plan is chosen if an APK will be distributed.
- The risk register has been reread.
- Out-of-scope items have been written down.
- Any future-version ideas triggered by this milestone have been parked.
- Claude will be instructed to build only against the cited lock IDs.
- Claude will be told what success looks like.
- Claude will be told what must not change.
- Claude will be told which long files were read in chunks if any.
- A fallback is known if the main approach fails.
- A test plan exists that Charan can actually run on Pixel 8.

## Stop Conditions

Do not start the milestone if any of these are true:

- the lock IDs are unclear
- the milestone depends on memory
- the milestone mixes v1 and future-version scope
- the milestone has no test plan
- the milestone touches high-risk money logic without verification criteria
- the milestone will distribute APKs without a build-ID plan
- the milestone depends on vague verbal tester feedback with no evidence-capture plan

## Exit Condition

The milestone may start only when the answer to this is yes:

"If this goes wrong, do we already know how we will notice it and what we will do next?"
