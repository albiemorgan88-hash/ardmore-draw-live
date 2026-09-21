import assert from "node:assert/strict";
import test from "node:test";
import { mapStripeSubscriptionStatus, renewalPayment, type RenewalInvoice } from "../src/lib/subscription-renewal";
import { createConnectState, verifyConnectState } from "../src/lib/connect-state";
import { getStripe } from "../src/lib/stripe";
import { selectRecoveryInvoices, type PlannedInvoice } from "./recovery-plan";

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

test("missing preview credentials never become fallback payment credentials", () => {
  delete process.env.STRIPE_SECRET_KEY;
  assert.throws(getStripe,/not configured/);
});

const recoveryPlan: PlannedInvoice[] = Array.from({length:108}, (_, index) => ({
  invoice_id:`in_synthetic_${index}`, subscription_id:"sub_synthetic", user_id:"member_synthetic",
  payment_key:`pi_synthetic_${index}`, amount_paid:250, currency:"gbp", paid_at:1_700_000_000+index,
}));

test("sample recovery selects exactly one invoice with a retrievable event", () => {
  const available=new Set([recoveryPlan[84].invoice_id,recoveryPlan[85].invoice_id]);
  assert.deepEqual(selectRecoveryInvoices(recoveryPlan,available,true),[recoveryPlan[84]]);
  assert.equal(selectRecoveryInvoices(recoveryPlan,available,false).length,108);
  assert.throws(()=>selectRecoveryInvoices(recoveryPlan,new Set(),true),/retrievable/);
});

test("sample mode cannot bypass the reviewed full-batch identity, amount and currency checks", () => {
  const available=new Set([recoveryPlan[0].invoice_id]);
  const duplicate=recoveryPlan.map(item=>({...item}));
  duplicate[107].invoice_id=duplicate[0].invoice_id;
  const wrongAmount=recoveryPlan.map(item=>({...item}));
  wrongAmount[107].amount_paid=251;
  const wrongCurrency=recoveryPlan.map(item=>({...item}));
  wrongCurrency[107].currency="usd";
  for (const invalid of [recoveryPlan.slice(0,1),duplicate,wrongAmount,wrongCurrency]) {
    assert.throws(()=>selectRecoveryInvoices(invalid,available,true),/reviewed/);
  }
});
