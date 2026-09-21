# Ardmore stack repair — 21 September 2026

## Release status

Prepared on `codex/ardmore-stack-reliability-20260921`. On 21 September Phil
explicitly approved the database repairs and deployment, and excluded historical
invoice reconciliation. The earlier database approval hold is resolved.

All three reviewed migrations were applied and read back at 21:32 UTC. Public
write grants and private-table read grants are absent; the four restricted
functions are executable only by the service role. Public number-availability
reads remain available. Both established number 97 selection identities remain.
Payment totals and draw counts were unchanged by the migrations. The deployment
and live verification evidence are recorded with PR #2.

## Production source reconciliation

`origin/main` was at `412715c`, behind the live July deployment. Commit `15403ac`
restores the app from the exact source hashes in Vercel deployment
`dpl_4yokWUsAE3XJ9UC6K7tnYvTuBZXA`. See `production-source-2026-09-21.json`.
Existing dirty work in the original checkout was preserved. Environment files,
private backups and participant exports were excluded.

## Changes

- Upgrade Next.js 16.1.6 to 16.3.5, React to 19.2.4 and Resend to 6.28.1;
  update compatible transitive dependencies. npm audit reports zero findings.
- Initialise Stripe only when a payment operation is requested. Preview builds
  do not receive production payment credentials; missing keys fail closed.
- Apply the same boundary to database access. Public previews build without
  live credentials; account and prize-claim screens show an unavailable state
  until their environment is configured. Node 24 CI runs all checks without
  production secrets.
- Restrict public access to draw/payment writes and claim tokens, and restrict
  unguarded legacy draw functions to the service role. Browser availability
  lookup retains only its required columns. Private payout reads retain the
  existing owner policy. No draw or payout is executed.
- Preserve the existing shared number 97 agreement. Capture its two current
  selection identities, retain them through payment failure/recovery, and
  reject any new conflicting allocation. The draw's existing split-prize logic
  is unchanged. Reconcile one member's entries in a single database transaction.
- Use a five-minute Stripe processing lease and return a retryable response
  while another worker holds it. A stale lease can be reclaimed; an old worker
  cannot mark a newer attempt completed.
- Record the actual paid invoice amount and paid date. Retrieve current Stripe
  subscription state so an old invoice cannot reactivate a cancelled entry.
- Treat Resend rejection as failure. Renewal receipts have plain text and a
  provider idempotency key; renewals older than 24 hours are reconciled without
  sending a stale confirmation.
- Require the signed-in prize owner to start bank onboarding from a claim link;
  callback state binds member, account, claim and expiry. Six pending claim
  tokens were unexpired during inspection, so the old link alone is insufficient
  to authorise bank setup. Returning winners can sign in and reopen their link.
- Return 503 when the pot cannot be read; retain unavailable placeholders in the
  UI. Checkout fails closed when availability cannot be checked and respects
  past-due number reservations. A member with several subscriptions can open
  the most recently created customer's billing portal.
- Continue daily reconciliation for unaffected members if one fails; return a
  failure count and structured log. `GET /api/draw/reconcile?dryRun=true` is a
  protected, read-only check of recent failed and stalled webhook events.
- Resolve framework lint errors in touched/affected screens; keep display
  confetti deterministic and read stored selection hints through React's
  external-store interface. Stored hints are not payment evidence.

## Required database order

1. `20260921194444_ardmore_access_controls.sql`
2. `20260921195027_ardmore_renewal_integrity.sql`
3. `20260921195410_ardmore_webhook_leases.sql`

All are scoped to Ardmore's existing draw infrastructure in project
`smhzgkvatlwbaxlyhnbm`. The shared UKTJ and House Price Derry tables are unchanged.
The current deployed code remains compatible with these database changes.

Applied migration versions: access controls `20260921213146`, renewal integrity
`20260921213155`, webhook leases `20260921213204`. The management API assigns
application timestamps; the reviewed source filenames above remain unchanged.

## Payment recovery evidence

Stripe account `acct_1T69pRASm3u8i3nl` confirms 108 paid renewal invoices totalling
£270 missing from the local ledger since May, affecting six subscriptions owned
by two members. All six subscriptions are currently active. The latest 24 events
(£60) remain retrievable from Stripe. The older event payloads return 404, but
their invoice records remain available and were independently matched.

`scripts/recover-renewals.ts` requires the separately reviewed private invoice
and event evidence files. It defaults to read-only verification. Historical
recovery is deferred by Phil's explicit instruction and must not be run as part
of this release. If separately authorised later, use `--sample --execute` for
one invoice with a retrievable event, independently
verify the payment, selection and event records, then use `--execute` for the
reviewed batch. Sample mode still validates the complete 108-invoice input;
rerunning selects the same invoice. The full batch records invoices with their
actual paid dates and no historical member
name/number guesses. Only the 24 retrievable event records can be marked
processed. Older error records remain as history. There is also an older
4 August checkout failure whose event payload is no longer retrievable; it is
not declared repaired by this batch.

The script contains no Stripe mutation, draw execution, payout or email call.
Do not send historical receipt catch-up messages as part of the recovery.

## Validation

- 48 synthetic Postgres assertions cover public/private access, legacy 97
  renewal and payment-failure recovery, new duplicate denial, stable identities,
  atomic rollback and event lease ownership.
- Seven policy tests cover exact paid amounts, rejected invoices, cancelled
  subscription status, callback tampering/expiry, missing payment credentials,
  one-invoice recovery selection and full-batch validation in sample mode.
- Full lint (zero errors; existing non-blocking warnings), TypeScript and
  production build pass. No real draw, payment or email is used in testing.
- Release verification: confirm the production SHA, protected read-only health,
  public smoke checks and unchanged draw schedules. Do not run historical ledger
  recovery, including the one-invoice sample.
