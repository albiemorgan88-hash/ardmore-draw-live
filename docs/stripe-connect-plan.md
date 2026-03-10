# Stripe Connect Implementation Plan — Ardmore CC Draw

**Date:** 10 March 2026  
**Status:** Draft for PJ review  
**Current state:** Standard Stripe (Checkout Sessions + Subscriptions), Supabase DB, draw cron runs Friday 7pm, emails winners via Resend. No automated payouts yet.

---

## Revenue Split (per draw pot)

| Recipient | % | Notes |
|-----------|---|-------|
| 1st prize | 25% | Winner |
| 2nd prize | 15% | Winner |
| 3rd prize | 10% | Winner |
| Club (Ardmore CC) | 40% | Auto-payout weekly |
| Platform (ClubDraw) | 7.5% | Our margin |
| Stripe fees | 2.5% | Baked into pricing |

> ⚠️ **Current code uses a 50/50 split (50% winners, 50% club, 0% platform).** This needs updating regardless of payout method chosen.

---

## 1. Stripe Connect Express vs Custom — Recommendation

### Express (✅ Recommended)

- Stripe handles KYC/identity verification, tax forms, compliance
- Hosted onboarding — we send a link, winner fills it in, done
- Dashboard for connected accounts to see their payouts
- ~30 min to implement onboarding flow
- **Limitation:** 0.25% + 25p per payout on top of platform fees (see §5)

### Custom

- Full control over UX but **we own compliance/KYC** — massive liability
- Only makes sense at scale (100+ clubs)
- **Not worth it for this stage**

### Verdict: **Express accounts.** Zero compliance burden, fast to ship.

---

## 2. Winner Onboarding Flow

```
Winner gets email → "Claim your £X prize" link
  → /claim?token=xyz (one-time secure token)
    → If no Connect account: Stripe hosted onboarding (Express)
    → If already onboarded: "Prize will be sent to your account"
  → Account ID saved to profiles.stripe_connect_id in Supabase
```

### Key details:
- **One-time setup.** Winner onboards once, auto-paid for all future wins
- **Unclaimed prizes:** If winner doesn't onboard within 14 days, prize rolls to next draw (or manual bank transfer at admin discretion)
- **Supabase schema change:** Add `stripe_connect_id` and `stripe_connect_status` to `profiles` table
- Winners only need: bank account + ID verification (Stripe handles this)
- No ongoing interaction needed from winners after initial setup

---

## 3. Club Account Setup (Ardmore CC)

- Create **one Express account** for Ardmore CC during initial setup
- Club treasurer completes onboarding (business details, bank account)
- Store the connected account ID in `clubs` table → `stripe_connect_id`
- 40% auto-transferred after each draw (after admin approval)
- Club can view payout history in their Stripe Express dashboard

---

## 4. Payout Flow

```
Friday 7pm: Draw cron fires
  → Pick winners (existing logic)
  → Calculate splits (update to new percentages)
  → Insert draw record with status: "pending_approval"
  → Email admin with draw results + approval link

Admin reviews at /draw/manage:
  → See winners, amounts, confirm correct
  → Click "Approve & Pay"

Approval triggers:
  → For each winner WITH stripe_connect_id:
      stripe.transfers.create({
        amount: prize_amount_pence,
        currency: 'gbp',
        destination: winner.stripe_connect_id,
        transfer_group: `draw_${draw_number}`
      })
  → For club:
      stripe.transfers.create({
        amount: club_share_pence,
        currency: 'gbp',
        destination: club.stripe_connect_id,
        transfer_group: `draw_${draw_number}`
      })
  → Platform's 7.5% stays in our Stripe balance (no transfer needed)
  → Update draw status: "paid"
  → Email winners: "Your prize of £X has been sent"
  → Flag any winners without Connect accounts: "unclaimed"
```

### Edge cases:
- **Winner not onboarded:** Prize held, reminder email sent, 14-day deadline
- **Transfer fails:** Retry once, then flag for manual resolution
- **Multiple people share a number:** Split that prize equally between them (already tracked in `ownerMap`)

---

## 5. Fee Impact on 7.5% Platform Margin

### Stripe Connect Express fees (UK):

| Fee | Amount | When |
|-----|--------|------|
| Transfer to connected account | Free | Creating the transfer |
| Payout from connected account to bank | **0.25% + 25p** per payout | When Stripe pays out to their bank |

**But wait** — the 0.25% + 25p is charged to the *connected account* (the winner/club), not us. We can either:

1. **Let winners absorb it** (simplest — they get slightly less)
2. **Gross up transfers** to cover the fee (costs us ~£0.30-0.50 per payout)
3. **Set `on_behalf_of`** to keep fees on our platform account

### Example: £200 pot week

| Split | Amount | Connect payout fee | Net to recipient |
|-------|--------|-------------------|------------------|
| 1st (25%) | £50.00 | £0.38 | £49.62 |
| 2nd (15%) | £30.00 | £0.33 | £29.68 |
| 3rd (10%) | £20.00 | £0.30 | £19.70 |
| Club (40%) | £80.00 | £0.45 | £79.55 |
| Platform (7.5%) | £15.00 | — | £15.00 (stays in balance) |
| Stripe (2.5%) | £5.00 | — | Already deducted at checkout |

**Platform margin impact: None** — the 0.25% + 25p comes off the recipient, not us. Our 7.5% is clean.

**Recommendation:** Let recipients absorb it. The fees are tiny (30-45p) and it's standard. Mention it in T&Cs.

---

## 6. Implementation Steps

| # | Task | Effort | Dependencies |
|---|------|--------|--------------|
| 1 | Update revenue split in draw API (50/50 → 50/40/7.5/2.5) | 30 min | None |
| 2 | Add `stripe_connect_id`, `stripe_connect_status` to `profiles` table in Supabase | 15 min | None |
| 3 | Add `stripe_connect_id` to `clubs` table | 15 min | None |
| 4 | Create Connect Express onboarding API route (`/api/connect/onboard`) | 1 hr | Stripe Connect enabled on account |
| 5 | Create Connect OAuth return handler (`/api/connect/callback`) | 45 min | #4 |
| 6 | Build winner claim page (`/claim`) | 1 hr | #4, #5 |
| 7 | Onboard Ardmore CC as connected account (one-time) | 15 min | #4, #5 |
| 8 | Add `payouts` table to Supabase (draw_id, recipient, amount, status, stripe_transfer_id) | 30 min | None |
| 9 | Build payout execution API (`/api/draw/payout`) with admin approval | 2 hr | #4, #8 |
| 10 | Update `/draw/manage` UI — show split breakdown + "Approve & Pay" button | 1.5 hr | #9 |
| 11 | Update draw cron to set `pending_approval` status instead of `drawn` | 30 min | #9 |
| 12 | Add Stripe webhook handler for `transfer.paid` / `transfer.failed` | 1 hr | #9 |
| 13 | Email notifications — winner claim link, payout confirmation | 45 min | #6, #9 |
| 14 | Unclaimed prize handling (14-day rollover logic) | 1 hr | #9 |
| **Total** | | **~10 hrs** | |

### Pre-requisite:
- Enable Stripe Connect on the existing Stripe account (Settings → Connect → Get started)
- Choose "Express" account type
- Set platform branding (ClubDraw logo, colours)

---

## 7. Alternative: Direct Bank Transfers (No Connect)

### How it works:
- Collect bank details (sort code + account number) from winners and club
- Use Stripe Payouts API to send money directly to bank accounts
- **No connected accounts needed**

### Pros:
- Simpler — no onboarding flow, no connected accounts
- Slightly cheaper (no 0.25% + 25p per transfer)
- Faster to implement (~6 hrs vs ~10 hrs)

### Cons:
- **We hold and transmit bank details** — PCI-like compliance burden
- **We become the merchant of record** for payouts — regulatory risk
- **No Stripe dashboard** for recipients to track their payouts
- Bank details can go stale (people switch banks)
- **Manual bank detail collection** — worse UX than Stripe's hosted onboarding
- If a payout fails (wrong details), debugging is on us

### Verdict: **Not recommended.**

The 4 extra hours for Connect Express are worth it. Stripe handles compliance, bank detail storage, and recipient dashboards. The payout fees are negligible (30-45p per transfer). At scale across multiple clubs, Connect is the only sane path.

---

## Decision Required

**PJ — pick one:**

- [ ] **Option A: Stripe Connect Express** (recommended) — ~10 hrs, clean, scalable
- [ ] **Option B: Direct bank transfers** — ~6 hrs, hacky, compliance risk
- [ ] **Option C: Manual payouts for now** — 0 hrs, admin does bank transfers manually, automate later

> Option C is honest and valid if the priority is launching the draw ASAP. You can always bolt on Connect later. The draw logic + email notifications work today — the only missing piece is automated money movement.

---

## Next Steps (after approval)

1. Enable Stripe Connect on the Stripe dashboard
2. Run Supabase migrations (steps 2, 3, 8)
3. Build the API routes (steps 4, 5, 9)
4. Build the UI (steps 6, 10)
5. Onboard Ardmore CC as first connected account
6. Test with a £1 draw
7. Go live
