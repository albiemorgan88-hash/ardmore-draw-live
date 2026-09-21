import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function claimStripeEvent(db: SupabaseClient, event: { id: string; type: string }) {
  const token = randomUUID();
  const { data, error } = await db.rpc("claim_ardmore_stripe_event", {
    p_id: event.id, p_type: event.type, p_token: token,
  });
  if (error) throw new Error(`Stripe event claim failed: ${error.message}`);
  if (!data || typeof data.claimed !== "boolean") throw new Error("Invalid Stripe event claim result");
  return { claimed: data.claimed as boolean, processed: data.processed === true, token };
}

export async function finishStripeEvent(db: SupabaseClient, id: string, token: string, failure?: string) {
  const now = new Date().toISOString();
  const { data, error } = await db.from("stripe_events").update({
    status: failure ? "failed" : "processed",
    error_message: failure || null,
    processed_at: failure ? null : now,
    updated_at: now,
    lease_token: null,
    lease_expires_at: null,
  }).eq("id", id).eq("status", "processing").eq("lease_token", token).select("id").maybeSingle();
  if (error || !data) throw new Error(`Stripe event completion failed: ${error?.message || "lease no longer owned"}`);
}
