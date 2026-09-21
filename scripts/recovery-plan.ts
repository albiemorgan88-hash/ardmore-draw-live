export type PlannedInvoice = {
  invoice_id: string;
  subscription_id: string;
  user_id: string;
  payment_key: string;
  amount_paid: number;
  currency: string;
  paid_at: number;
};

export function selectRecoveryInvoices(
  plan: PlannedInvoice[],
  retrievableInvoiceIds: Set<string>,
  sample: boolean,
): PlannedInvoice[] {
  if (plan.length !== 108 || new Set(plan.map(item => item.invoice_id)).size !== 108
      || plan.some(item => item.currency !== "gbp" || !Number.isInteger(item.amount_paid) || item.amount_paid <= 0)
      || plan.reduce((sum, item) => sum + item.amount_paid, 0) !== 27000) {
    throw new Error("Plan differs from the reviewed 108-invoice, £270 recovery batch");
  }
  if (!sample) return plan;
  // Exercise both payment recording and event completion in the first sample.
  // Preserve the reviewed input order so rerunning the sample selects the same invoice.
  const invoice = plan.find(item => retrievableInvoiceIds.has(item.invoice_id));
  if (!invoice) throw new Error("A sample requires a retrievable invoice.paid event");
  return [invoice];
}
