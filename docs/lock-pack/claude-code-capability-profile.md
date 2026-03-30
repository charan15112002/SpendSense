# Claude Code Capability Profile

Status: Active
Purpose: Record what Claude Code officially is, what it is good at, and how that should be interpreted inside the SpendSense workspace.

## 1. Official Source

Primary reference:

- [Anthropic: Claude Code product page](https://claude.com/product/claude-code)

This file is based on Anthropic's official product description, not on memory or assumptions from chat.

## 2. What Claude Code Officially Is

Claude Code is Anthropic's coding-focused agent experience designed to work:

- on desktop
- in the terminal
- inside IDEs
- on the web and iOS
- in Slack

According to Anthropic's product page, Claude Code is positioned as a coding assistant that can work directly in a codebase, answer questions, make changes, and operate through existing developer tools.

## 3. Officially Described Capabilities

Anthropic describes Claude Code as being able to:

- work directly in a codebase
- build, debug, and ship in terminal and IDE workflows
- explore codebase context
- answer technical questions
- make code changes
- use CLI tools
- show visual diffs in desktop and IDE workflows
- manage multiple parallel tasks in the desktop app
- preview servers and monitor pull-request status in desktop workflows
- handle delegated bug fixes and routine tasks from web/iOS
- operate with an "Auto mode" that balances approvals and autonomy

## 4. Workspace Interpretation For SpendSense

Inside this project, those official capabilities mean Claude is well-suited for:

- milestone-scoped implementation
- code generation
- native and JS debugging
- reading targeted code context
- making bounded edits
- using terminal tools for coding tasks
- generating structured test procedures after code exists
- analyzing exported evidence bundles for implementation defects

## 5. What Claude Should Be Trusted For

Claude should be trusted for:

- milestone-scoped implementation
- code-level problem solving
- technical diagnosis from logs and evidence
- iterative fixes after evidence review
- explaining what changed and what remains

## 6. What Claude Should NOT Be Treated As

Claude should not be treated as:

- canonical memory of the product
- owner of the Lock Pack
- final arbiter of lock alignment
- decider of scope changes
- silent resolver of legal or trust conflicts

Official capability does not override project governance.

## 7. Strength Areas Relevant To SpendSense

Claude is especially well-matched to tasks where:

- the code task is concrete
- the write scope is clear
- relevant lock IDs are already known
- the task benefits from terminal or IDE execution
- the result can be checked against evidence and tests

Examples:

- implementing native listener modules
- wiring build flavors
- creating parser logic
- fixing prompt-delivery bugs
- interpreting exported test evidence

## 8. Risk Areas Relevant To SpendSense

Claude remains risky when:

- asked to work from broad memory
- allowed to infer product truth from old code
- given vague prompts instead of lock-scoped briefs
- asked to silently resolve design/compliance tensions
- asked to proceed without evidence, tests, or traceability

These risks exist even if Claude Code is technically capable.

## 9. SpendSense Rule For Using Claude

Use Claude when all are true:

1. the milestone is clear
2. the relevant lock IDs are known
3. the source files are identified
4. the out-of-scope items are explicit
5. success criteria and tests are known

If those are not true, Codex should tighten the process first.

## 10. Final Working Conclusion

Claude Code is a strong implementation and debugging engine.
In SpendSense, Claude should be used as:

- technical co-founder
- implementation worker
- debugging partner

But not as:

- product memory
- process owner
- lock guardian

That split is intentional and should remain stable throughout implementation.
