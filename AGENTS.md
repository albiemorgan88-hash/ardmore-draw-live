# Ardmore Cricket

This repository serves Ardmore Cricket at ardmorecricket.com (`albiemorgan88-hash/ardmore-draw-live`). Verify the checkout and remote; preserve unfinished draw and payment work by isolating new changes.

Read the relevant code and current operational record before acting. SPEC.md and old payout plans contain historical proposals, including multi-club and financial assumptions; verify the current code, configuration, provider state and approved terms instead of treating those proposals as live facts.

Changes involving entries, winners, draw execution, receipts, payouts or payment reconciliation require exact identities, amounts and evidence. Do not run a real draw, charge, payout or email as a test. Use deterministic fixtures or provider test mode. Spending, real draws, external messages and production releases require explicit scoped authorisation; preserve approval already given.

Use the scripts present in package.json and checks appropriate to the change. Keep secrets and participant data out of output. Keep other-client and personal context out of club work. Report local checks, repository pushes and verified live outcomes separately.
