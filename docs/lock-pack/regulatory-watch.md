# Regulatory Watch

Status: Active
Purpose: Keep regulation monitoring lightweight, explicit, and manageable for a one-founder app.

## Operating Principle

SpendSense is not building a legal team.
It is building a repeatable regulatory check routine.

## Monitoring Cadence

Review these areas:

- Before public beta
- Before public launch
- Quarterly after launch
- Immediately before enabling any new compliance-sensitive feature

## What To Monitor

| Area | Why It Matters | Current Status |
|---|---|---|
| DPDPA / DPDP Rules updates | Could affect consent, retention, breach duties, cross-border transfer | Active watch |
| MeitY AI governance / new AI law | Could affect optional AI integration | Active watch |
| RBI circulars affecting notification content or payment-data handling | Could affect parser inputs or regulatory perimeter | Active watch |
| NPCI guidance on third-party use of UPI transaction data | Could affect notification/SMS-based parsing posture | Active watch |
| Google Play policy updates | Could affect Play listing, data safety, financial declarations, permission review | Active watch |

## Founder-Safe Rule

If a regulatory update is ambiguous:

1. Do not guess.
2. Do not silently change user-facing behavior.
3. Add it to the compliance ledger or constraint ledger.
4. Gate the affected feature until clarified if the risk is material.
