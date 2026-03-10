import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ardmorecricket.com";

/**
 * POST /api/connect/onboard
 * 
 * Two modes:
 * 1. Authenticated user onboarding (Authorization header)
 * 2. Claim token onboarding (token in body) — for winners who may not have accounts
 * 
 * Creates a Stripe Connect Express account and returns the onboarding URL.
 */
export async function POST(req: NextRequest) {
  const supabase = createServiceClient();
  const body = await req.json();
  const { claim_token } = body;

  let profileId: string;
  let email: string | undefined;
  let name: string | undefined;

  if (claim_token) {
    // Claim token mode — look up the token
    const { data: token, error } = await supabase
      .from("claim_tokens")
      .select("*")
      .eq("token", claim_token)
      .eq("status", "pending")
      .single();

    if (error || !token) {
      return NextResponse.json({ error: "Invalid or expired claim token" }, { status: 400 });
    }

    if (new Date(token.expires_at) < new Date()) {
      await supabase.from("claim_tokens").update({ status: "expired" }).eq("id", token.id);
      return NextResponse.json({ error: "Claim token has expired" }, { status: 400 });
    }

    profileId = token.profile_id;

    // Get profile details
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, stripe_connect_id, stripe_connect_status")
      .eq("id", profileId)
      .single();

    if (profile?.stripe_connect_id && profile?.stripe_connect_status === "active") {
      // Already onboarded — mark token as claimed
      await supabase.from("claim_tokens").update({ status: "claimed" }).eq("id", token.id);
      return NextResponse.json({ 
        already_onboarded: true, 
        message: "Your bank account is already connected. Your prize will be sent automatically." 
      });
    }

    email = profile?.email;
    name = profile?.full_name;
  } else {
    // Authenticated user mode
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    profileId = user.id;
    email = user.email;
    name = user.user_metadata?.full_name;
  }

  // Check if they already have a Connect account
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_connect_id, stripe_connect_status")
    .eq("id", profileId)
    .single();

  let connectAccountId = profile?.stripe_connect_id;

  if (connectAccountId) {
    // Check if the account needs more onboarding
    const account = await stripe.accounts.retrieve(connectAccountId);
    if (account.details_submitted) {
      // Already fully onboarded
      await supabase.from("profiles").update({
        stripe_connect_status: "active",
      }).eq("id", profileId);

      return NextResponse.json({ 
        already_onboarded: true,
        message: "Your bank account is already connected." 
      });
    }
    // Account exists but onboarding incomplete — generate new link
  } else {
    // Create new Express account
    const account = await stripe.accounts.create({
      type: "express",
      country: "GB",
      email: email,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: "individual",
      metadata: {
        profile_id: profileId,
        platform: "clubdraw",
      },
      ...(name ? { individual: { first_name: name.split(" ")[0], last_name: name.split(" ").slice(1).join(" ") || undefined } } : {}),
    });

    connectAccountId = account.id;

    // Save to profiles
    await supabase.from("profiles").update({
      stripe_connect_id: connectAccountId,
      stripe_connect_status: "pending",
    }).eq("id", profileId);
  }

  // Create onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: connectAccountId!,
    refresh_url: `${SITE_URL}/claim${claim_token ? `?token=${claim_token}` : ""}`,
    return_url: `${SITE_URL}/api/connect/callback?account_id=${connectAccountId}&profile_id=${profileId}${claim_token ? `&claim_token=${claim_token}` : ""}`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
