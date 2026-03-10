# Payout Distribution Research — Ardmore Cricket Club Draw

**Date:** 10 March 2026  
**Status:** Decision needed  
**Context:** Platform collects ~£165/week via Stripe subscriptions. Needs to split funds to club, prize winners, and platform without all money flowing through platform's bank account.

---

## The Split

| Recipient | % | ~Weekly (£165) | ~Monthly (£660) |
|-----------|---|----------------|-----------------|
| Club | 40% | £66 | £264 |
| 1st Prize | 25% | £41.25 | £165 |
| 2nd Prize | 15% | £24.75 | £99 |
| 3rd Prize | 10% | £16.50 | £66 |
| Platform (Blue Canvas) | 7.5% | £12.38 | £49.50 |
| Stripe fees | 2.5% | £4.13 | £16.50 |

**Key requirement:** Platform only wants its 7.5% hitting its bank account. Club and prize money should flow directly to recipients.

---

## Option 1: Stripe Connect Express

**How it works:** Create "Express" connected accounts for the club and each prize winner. Stripe hosts the onboarding and compliance. You charge on platform, then transfer portions to each connected account.

### UK Onboarding UX (Express)
- Stripe-hosted flow — takes **2-5 minutes** for an individual
- Collects: full name, DOB, home address, last 4 of National Insurance number, bank account (sort code + account number)
- Some users may be asked for photo ID (passport/driving licence) — risk-based, not guaranteed
- Mobile-friendly, reasonably polished UI
- Account typically verified and ready for payouts within **minutes to 24 hours**

### Assessment

| Factor | Detail |
|--------|--------|
| **Setup complexity** | Medium. Need Connect platform setup, create account links, handle onboarding callbacks. ~1-2 weeks dev. |
| **Recipient friction** | Moderate. Every winner must complete Stripe onboarding before getting paid. For the club = one-time. For winners = every new winner needs onboarding. |
| **Fees** | Standard card processing (1.5% + 20p UK cards) already paid on collection. Connect Express payouts to connected accounts: **no additional per-payout fee** if Stripe bills connected accounts directly. If platform pays fees: **£2/month per active account + 0.25% + 10p per payout**. |
| **Tax implications** | Good — funds flow directly to recipients. Platform only receives its cut. Clean separation. |
| **KYC** | Stripe handles everything. Platform has zero compliance burden. |
| **Winner problem** | 🔴 **This is the dealbreaker.** You'd need 3 new winners every week to complete Stripe onboarding before you can pay them. Many won't bother for a £16-£41 prize. Creates massive friction and support overhead. |

### Verdict: ⚠️ Works for the club (one-time setup). Terrible for weekly rotating winners.

---

## Option 2: Stripe Connect Custom

**How it works:** Platform creates connected accounts on behalf of recipients via API, providing their details programmatically. Recipients never see Stripe. Platform owns the compliance.

### UK KYC Requirements (Custom, Individual)
Minimum to enable payouts:
- Full legal name
- Date of birth
- Home address
- Bank account (sort code + account number)
- Acceptance of Stripe ToS (platform can accept on their behalf)

At certain thresholds (~£2k processed or 30 days), Stripe may require:
- Last 4 digits of National Insurance number
- Government-issued photo ID scan

### Assessment

| Factor | Detail |
|--------|--------|
| **Setup complexity** | High. Full API integration, you handle all onboarding UI, requirement collection, and verification status monitoring. ~3-4 weeks dev. |
| **Recipient friction** | Very low for the club — you set up once. For winners — you still need their name, DOB, address, and bank details before paying them. Not zero friction. |
| **Fees** | £2/month per active connected account + 0.25% + 10p per payout. With 3 winners/week + club = potentially 12+ active accounts/month = ~£24+/month in account fees alone. |
| **Tax implications** | Same benefit — funds don't pass through platform. |
| **KYC** | 🔴 **Platform is responsible.** You must collect, store, and submit KYC data. If Stripe requests ID verification, you need to get photo IDs from prize winners. Major compliance headache for a small platform. |
| **Winner problem** | Still exists — you need personal details + bank details for every winner. Better than Express (no Stripe UI), but you're now holding PII. |

### Verdict: ❌ Too much compliance burden and active-account cost for weekly rotating winners.

---

## Option 3: Stripe Connect "Payout Only" (Custom, No Dashboard)

**How it works:** Same as Custom but with `controller.dashboard.type = "none"` and `controller.losses.payments = "application"`. Connected account exists purely to receive payouts. Platform manages everything.

### Reality Check
- This is just Custom accounts with fewer capabilities — same KYC requirements apply
- Stripe still requires identity verification for payout recipients
- You can defer some requirements initially but they kick in at thresholds
- No dashboard means platform handles all payout visibility/communication

### Assessment

| Factor | Detail |
|--------|--------|
| **Setup complexity** | Same as Custom — high. |
| **Recipient friction** | Slightly less (no dashboard to worry about) but still need their details. |
| **Fees** | Same as Custom: £2/month per active account + 0.25% + 10p per payout. |
| **Tax/KYC** | Same burden as Custom. |

### Verdict: ❌ Same problems as Custom, marginally simpler. Not worth the distinction.

---

## Option 4: Separate Charges and Transfers

**How it works:** Charge happens on the platform account. After the draw, create Transfer objects to move funds to connected accounts. Charge and transfer are decoupled — you control timing and amounts.

### How It Works in Practice
```
1. Customer pays £5/week → charge on platform account
2. Weekly draw happens
3. Platform creates transfers:
   - Transfer £66 → club's connected account
   - Transfer £41.25 → winner 1's connected account  
   - Transfer £24.75 → winner 2's connected account
   - Transfer £16.50 → winner 3's connected account
4. Platform keeps £12.38 (its 7.5%)
5. Stripe takes its fees from the platform balance
```

### Assessment
- GB is supported ✅
- You still need connected accounts for every recipient → **same winner onboarding problem**
- Advantage: charge is decoupled from transfer, so you can collect all week and distribute after the draw
- Platform is responsible for negative balances, refunds, and chargebacks
- Most flexible for split logic (multiple recipients per charge)

### Verdict: ⚠️ Best Stripe-native architecture for the split logic, but doesn't solve the core winner-onboarding problem. Only works if combined with a solution for paying winners.

---

## Option 5: Stripe for Collection + Open Banking/Bank Transfer for Distribution

**How it works:** Keep Stripe purely for subscription collection. All money lands in platform account. Use a separate service to push payments out to recipients' bank accounts.

### Sub-options:

#### 5a. TrueLayer Payouts API
- FCA-regulated, UK-focused
- Push payments to any UK bank account via Faster Payments
- Only need recipient's sort code + account number
- Instant settlement
- **Pricing:** Custom/enterprise — typically 20-50p per payout. Contact required.
- **Setup:** API integration, ~1-2 weeks. Need FCA-regulated merchant account with TrueLayer.
- **Downside:** Enterprise-focused, may not want to deal with a small platform. Minimum volumes may apply.

#### 5b. Wise Business API
- Wise Business account + API access
- Batch payments via CSV or API
- GBP to GBP domestic transfers via Faster Payments
- **Pricing:** GBP→GBP transfers: **~£0.35-0.75 per transfer** (flat fee, no percentage)
- **Setup:** Open Wise Business account (free), apply for API access, integrate. ~1-2 weeks.
- **Downside:** Need to fund the Wise account (manual or automated top-up). Money does pass through your Wise account briefly.

#### 5c. GoCardless (outbound)
- Primarily designed for Direct Debit collection, not push payments
- Does have "Instant Bank Pay" powered by Open Banking but focused on collection
- **Not ideal for outbound payouts** — wrong tool for this job

### Assessment

| Factor | Detail |
|--------|--------|
| **Setup complexity** | Low-Medium. Wise is simplest (business account + API). TrueLayer more complex. |
| **Recipient friction** | 🟢 **Near zero.** Just need sort code + account number. No onboarding, no sign-up, no app download. You can collect bank details at time of win. |
| **Fees** | Wise: ~£0.50/transfer × 4 recipients = **~£2/week, ~£8/month**. Vastly cheaper than Stripe Connect. |
| **Tax implications** | 🔴 **This is the trade-off.** All money flows through your platform account first (Stripe → your bank → Wise → recipients). You're handling the full gross amount. Need proper bookkeeping to show pass-through. Discuss with accountant. |
| **KYC** | None on recipients. Wise does KYC on you (the business) only. |
| **Time to implement** | 1-2 weeks including Wise Business account setup. |

### Verdict: ✅ Best option for recipient friction and cost. Tax pass-through concern is manageable with proper accounting.

---

## Option 6: PayPal Mass Payments / Wise Batch Transfers

### PayPal Mass Payments (Payouts API)
- Recipients need PayPal accounts → friction
- Fees: Free for UK domestic if funded from PayPal balance, otherwise 2% capped at £1/payment
- Recipients may incur withdrawal fees
- API is mature but PayPal business accounts have a reputation for freezes/holds
- **Verdict:** ❌ Recipient needs PayPal account = friction. PayPal account risk = headache.

### Wise Batch Transfers
- Upload CSV with bank details + amounts
- Process up to 1,000 payments at once
- Same low fees as individual transfers
- Can be done manually from dashboard (no API needed) or automated via API
- **Verdict:** ✅ Practical. Works even without API — CSV upload weekly takes 5 minutes.

---

## Comparison Matrix

| | Express | Custom | Payout-Only | Sep. Charges | Open Banking (Wise) | PayPal |
|---|---|---|---|---|---|---|
| **Winner friction** | 🔴 High | 🟡 Medium | 🟡 Medium | 🟡 Medium | 🟢 Low | 🔴 High |
| **Club friction** | 🟢 One-time | 🟢 One-time | 🟢 One-time | 🟢 One-time | 🟢 One-time | 🟡 Needs account |
| **Platform compliance** | 🟢 None | 🔴 Heavy | 🔴 Heavy | 🔴 Heavy | 🟢 None | 🟢 None |
| **Monthly cost** | ~£24+ | ~£24+ | ~£24+ | ~£24+ | **~£8** | ~£8-16 |
| **Tax separation** | 🟢 Clean | 🟢 Clean | 🟢 Clean | 🟢 Clean | 🟡 Pass-through | 🟡 Pass-through |
| **Dev effort** | 2 weeks | 4 weeks | 4 weeks | 3 weeks | **1 week** | 1 week |
| **Scalability** | Good | Good | Good | Good | Good | Poor |

---

## 🏆 RECOMMENDATION

### Short-term (now): Wise Business Batch Transfers (manual)

1. **Open a Wise Business account** (free, takes 1-2 days to verify)
2. **After each weekly draw:** withdraw club + prize money from Stripe to your bank, then initiate transfers via Wise dashboard
3. **Club:** set up as a standing recipient (one-time bank details)
4. **Winners:** collect sort code + account number when they win (you're probably already getting contact details for the draw)
5. **Weekly process:** CSV upload or manual 4 transfers. Takes 5 minutes.
6. **Cost:** ~£2/week in fees. Recipients get paid same day via Faster Payments.

### Medium-term (when scale justifies): Wise API Integration

Once you're processing 50+ members or multiple clubs:
1. Automate the payout flow via Wise API
2. Draw result triggers automatic transfers
3. Platform auto-deducts its 7.5% and Stripe fees, sends the rest

### What About Tax?

The money briefly passes through your platform account. This is fine if:
- Your accounts clearly show prize/club money as **pass-through** (not revenue)
- Only the 7.5% is booked as platform income
- Your accountant knows the structure

This is standard for any payment intermediary. It's the same as a letting agent collecting rent — the gross amount hits their account, they take their commission, pass the rest through. HMRC cares about your taxable income (7.5%), not the gross throughput.

### Why NOT Stripe Connect?

The rotating-winner problem kills it. Every Stripe Connect option requires creating a connected account per recipient with identity verification. For a weekly draw with 3 new winners, you'd be onboarding 150+ people per year to Stripe. Most won't do it for a £20 prize. It's architecturally elegant but practically unworkable for this use case.

Stripe Connect makes sense for platforms with **repeat recipients** (e.g., marketplace sellers, freelancers). It doesn't make sense for **one-off prize payouts to random individuals**.

### Action Items

- [ ] Open Wise Business account
- [ ] Set up Ardmore CC as a saved recipient
- [ ] Add "bank details" collection to the winner notification flow
- [ ] Run first manual payout cycle to validate the process
- [ ] Discuss pass-through accounting treatment with your accountant
- [ ] Revisit API automation when managing 3+ clubs

---

*Research compiled 10 March 2026. Stripe pricing and features change — verify Connect fees at [stripe.com/gb/connect/pricing](https://stripe.com/gb/connect/pricing) before committing to any Stripe-based approach.*
