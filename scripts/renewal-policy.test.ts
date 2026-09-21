import assert from "node:assert/strict";
import test from "node:test";
import { mapStripeSubscriptionStatus, renewalPayment, type RenewalInvoice } from "../src/lib/subscription-renewal";
import { createConnectState, verifyConnectState } from "../src/lib/connect-state";

const invoice = { id: "in_synthetic", status: "paid", billing_reason: "subscription_cycle", currency: "gbp", amount_paid: 250 } as RenewalInvoice;
const member = { user_id: "synthetic-member", club_id: "synthetic-club", numbers: [4,12,90] };

test("record actual paid amount, invoice identity and established fee calculation", () => {
  const payment = renewalPayment(invoice, member);
  assert.equal(payment.amount,250);
  assert.equal(payment.platform_fee,19);
  assert.equal(payment.stripe_invoice_id,"in_synthetic");
  assert.equal(payment.stripe_payment_intent_id,"in_synthetic");
  assert.equal(renewalPayment({...invoice,payment_intent:"pi_synthetic"},member).stripe_payment_intent_id,"pi_synthetic");
});

test("reject unpaid, foreign-currency and malformed renewal invoices", () => {
  for (const change of [{status:"open"},{currency:"usd"},{amount_paid:-1},{amount_paid:1.2},{billing_reason:"subscription_create"}]) {
    assert.throws(()=>renewalPayment({...invoice,...change} as RenewalInvoice,member),/verified paid GBP/);
  }
});

test("historical paid invoices do not grant active status to cancelled subscriptions", () => {
  assert.equal(mapStripeSubscriptionStatus("canceled"),"cancelled");
  assert.equal(mapStripeSubscriptionStatus("past_due"),"past_due");
  assert.equal(mapStripeSubscriptionStatus("unpaid"),"unpaid");
  assert.equal(mapStripeSubscriptionStatus("active"),"active");
});

test("Connect callback state binds the account, member, claim and expiry", () => {
  process.env.STRIPE_SECRET_KEY="sk_test_synthetic_only";
  const now=Date.now();
  const state=createConnectState("member-a","acct_a","claim-a",now);
  assert.equal(verifyConnectState(state,"member-a","acct_a","claim-a",now+1000),true);
  assert.equal(verifyConnectState(state,"member-b","acct_a","claim-a",now+1000),false);
  assert.equal(verifyConnectState(state,"member-a","acct_b","claim-a",now+1000),false);
  assert.equal(verifyConnectState(state,"member-a","acct_a","claim-b",now+1000),false);
  assert.equal(verifyConnectState(state+"tamper","member-a","acct_a","claim-a",now+1000),false);
  assert.equal(verifyConnectState(state,"member-a","acct_a","claim-a",now+31*60_000),false);
  assert.equal(verifyConnectState(null,"member-a","acct_a","claim-a",now),false);
});
