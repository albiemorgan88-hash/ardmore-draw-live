import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ardmorecricket.com";

/**
 * GET /api/connect/callback
 * 
 * Stripe redirects here after Express onboarding.
 * Verifies the account is fully onboarded, updates DB, redirects to success page.
 */
export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get("account_id");
  const profileId = req.nextUrl.searchParams.get("profile_id");
  const claimToken = req.nextUrl.searchParams.get("claim_token");

  if (!accountId || !profileId) {
    return NextResponse.redirect(`${SITE_URL}/claim?error=missing_params`);
  }

  const supabase = createServiceClient();

  try {
    const account = await stripe.accounts.retrieve(accountId);

    if (account.details_submitted) {
      // Onboarding complete
      await supabase.from("profiles").update({
        stripe_connect_id: accountId,
        stripe_connect_status: "active",
      }).eq("id", profileId);

      // If there's a claim token, mark it claimed
      if (claimToken) {
        await supabase.from("claim_tokens").update({ status: "claimed" }).eq("token", claimToken);
      }

      // Check if there are any pending payouts for this user — now they can be paid
      const { data: pendingPayouts } = await supabase
        .from("payouts")
        .select("id")
        .eq("recipient_profile_id", profileId)
        .eq("status", "unclaimed");

      if (pendingPayouts && pendingPayouts.length > 0) {
        // Update unclaimed payouts to pending — they'll be picked up on next admin approval
        await supabase
          .from("payouts")
          .update({ 
            status: "pending", 
            recipient_connect_id: accountId,
            updated_at: new Date().toISOString() 
          })
          .eq("recipient_profile_id", profileId)
          .eq("status", "unclaimed");
      }

      return NextResponse.redirect(`${SITE_URL}/claim/success`);
    } else {
      // Onboarding not complete — they left early
      return NextResponse.redirect(`${SITE_URL}/claim?error=incomplete&token=${claimToken || ""}`);
    }
  } catch (error: any) {
    console.error("Connect callback error:", error);
    return NextResponse.redirect(`${SITE_URL}/claim?error=stripe_error`);
  }
}
