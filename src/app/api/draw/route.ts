import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendDrawResults, sendWinnerClaimEmail } from "@/lib/email";
import crypto from "crypto";

const CLUB_ID = "31846fb2-b120-4815-bd48-e1120342d52e";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Provably fair: pick unique winning numbers from a pool
function pickWinners(pool: number[], count: number, seed: string): number[] {
  const unique = [...new Set(pool)];
  if (unique.length < count) return unique;

  const winners: number[] = [];
  const available = [...unique];

  for (let i = 0; i < count; i++) {
    const hash = crypto.createHash("sha256").update(`${seed}-pick-${i}`).digest();
    const index = hash.readUInt32BE(0) % available.length;
    winners.push(available[index]);
    available.splice(index, 1);
  }

  return winners;
}

export async function GET(req: NextRequest) {
  // Auth: accept Vercel cron secret via Authorization header or query param
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const querySecret = req.nextUrl.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET || process.env.DRAW_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET/DRAW_SECRET environment variable not set");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (bearerToken !== cronSecret && querySecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Idempotency: check if a draw already exists for this week
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() + diffToMonday);
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

  const { data: existingDraw } = await supabase
    .from("draws")
    .select("*")
    .eq("club_id", CLUB_ID)
    .gte("drawn_at", weekStart.toISOString())
    .lt("drawn_at", weekEnd.toISOString())
    .order("draw_number", { ascending: true })
    .limit(1)
    .single();

  if (existingDraw) {
    return NextResponse.json({
      success: true,
      already_drawn: true,
      draw_number: existingDraw.draw_number,
      message: "Draw already completed for this week.",
    });
  }

  // Get all active selections for the club
  const { data: selections, error: selErr } = await supabase
    .from("number_selections")
    .select("id, profile_id, numbers")
    .eq("club_id", CLUB_ID)
    .eq("status", "active");

  if (selErr) {
    return NextResponse.json({ error: "Failed to fetch selections", details: selErr }, { status: 500 });
  }

  if (!selections || selections.length === 0) {
    return NextResponse.json({ error: "No entries this week" }, { status: 400 });
  }

  // Build number pool and ownership map
  const allNumbers: number[] = [];
  const ownerMap = new Map<number, string[]>();

  for (const sel of selections) {
    for (const n of sel.numbers) {
      allNumbers.push(n);
      const owners = ownerMap.get(n) || [];
      owners.push(sel.profile_id);
      ownerMap.set(n, owners);
    }
  }

  const totalEntries = allNumbers.length;
  const totalPotPence = totalEntries * 100; // £1 per number

  // Generate provably fair seed
  const drawSeed = crypto.randomUUID();
  const winningNumbers = pickWinners(allNumbers, 3, drawSeed);

  // Calculate prizes — NEW SPLIT: 50% winners, 40% club, 7.5% platform, 2.5% fees
  const prizes = {
    first: Math.round(totalPotPence * 0.25),
    second: Math.round(totalPotPence * 0.15),
    third: Math.round(totalPotPence * 0.10),
    club: Math.round(totalPotPence * 0.40),
    platform: Math.round(totalPotPence * 0.075),
    fees: Math.round(totalPotPence * 0.025),
  };

  // Get next draw number
  const { data: maxDraw } = await supabase
    .from("draws")
    .select("draw_number")
    .eq("club_id", CLUB_ID)
    .order("draw_number", { ascending: false })
    .limit(1)
    .single();
  const drawNumber = (maxDraw?.draw_number || 0) + 1;

  // Insert draw record with pending_payout status
  const { data: drawRecord, error: drawErr } = await supabase.from("draws").insert({
    club_id: CLUB_ID,
    draw_number: drawNumber,
    status: "pending_payout",
    scheduled_at: new Date().toISOString(),
    drawn_at: new Date().toISOString(),
    seed: drawSeed,
    seed_hash: crypto.createHash("sha256").update(drawSeed).digest("hex"),
    drawn_numbers: winningNumbers,
    total_entries: totalEntries,
    pot_amount: totalPotPence,
    prize_pool: prizes.first + prizes.second + prizes.third,
    platform_fee: prizes.platform,
    club_share: prizes.club,
    rollover_amount: 0,
  }).select("id").single();

  if (drawErr || !drawRecord) {
    console.error("Failed to insert draw:", drawErr);
    return NextResponse.json({ error: "Failed to create draw record" }, { status: 500 });
  }

  const drawId = drawRecord.id;

  // Get participant info
  const profileIds = [...new Set(selections.map((s) => s.profile_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, stripe_connect_id, stripe_connect_status")
    .in("id", profileIds);

  let emailMap = new Map<string, { email: string; name: string; connectId?: string; connectStatus?: string }>();
  if (profiles && profiles.length > 0 && profiles[0].email) {
    for (const p of profiles) {
      emailMap.set(p.id, { 
        email: p.email, 
        name: p.full_name || "",
        connectId: p.stripe_connect_id || undefined,
        connectStatus: p.stripe_connect_status || undefined,
      });
    }
  } else {
    const { data: authData } = await supabase.auth.admin.listUsers();
    if (authData?.users) {
      for (const u of authData.users) {
        if (profileIds.includes(u.id)) {
          emailMap.set(u.id, { email: u.email || "", name: u.user_metadata?.full_name || "" });
        }
      }
    }
  }

  // Create payout records for each recipient
  const payoutRecords = [];

  // Winner payouts
  const prizeAmounts = [prizes.first, prizes.second, prizes.third];
  const prizeTypes: Array<"winner_1st" | "winner_2nd" | "winner_3rd"> = ["winner_1st", "winner_2nd", "winner_3rd"];

  for (let i = 0; i < winningNumbers.length; i++) {
    const ownerIds = ownerMap.get(winningNumbers[i]) || [];
    // If multiple owners share a number, split that prize
    const prizePerOwner = Math.floor(prizeAmounts[i] / Math.max(ownerIds.length, 1));

    for (const ownerId of ownerIds) {
      const info = emailMap.get(ownerId);
      payoutRecords.push({
        draw_id: drawId,
        club_id: CLUB_ID,
        recipient_type: prizeTypes[i],
        recipient_profile_id: ownerId,
        recipient_connect_id: info?.connectStatus === "active" ? info.connectId : null,
        recipient_name: info?.name || null,
        amount_pence: ownerIds.length > 1 ? prizePerOwner : prizeAmounts[i],
        winning_number: winningNumbers[i],
        status: info?.connectStatus === "active" ? "pending" : "unclaimed",
      });
    }
  }

  // Club payout
  const { data: club } = await supabase
    .from("clubs")
    .select("stripe_connect_id")
    .eq("id", CLUB_ID)
    .single();

  payoutRecords.push({
    draw_id: drawId,
    club_id: CLUB_ID,
    recipient_type: "club",
    recipient_profile_id: null,
    recipient_connect_id: club?.stripe_connect_id || null,
    amount_pence: prizes.club,
    winning_number: null,
    status: club?.stripe_connect_id ? "pending" : "unclaimed",
  });

  // Platform share (stays in our balance)
  payoutRecords.push({
    draw_id: drawId,
    club_id: CLUB_ID,
    recipient_type: "platform",
    recipient_profile_id: null,
    recipient_connect_id: null,
    amount_pence: prizes.platform,
    winning_number: null,
    status: "pending",
  });

  // Insert all payout records
  const { error: payoutErr } = await supabase.from("payouts").insert(payoutRecords);
  if (payoutErr) {
    console.error("Failed to insert payout records:", payoutErr);
  }

  // Create claim tokens for winners without Connect accounts
  for (let i = 0; i < winningNumbers.length; i++) {
    const ownerIds = ownerMap.get(winningNumbers[i]) || [];
    for (const ownerId of ownerIds) {
      const info = emailMap.get(ownerId);
      if (!info?.connectId || info?.connectStatus !== "active") {
        const claimToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 14);

        await supabase.from("claim_tokens").insert({
          draw_id: drawId,
          profile_id: ownerId,
          token: claimToken,
          winning_number: winningNumbers[i],
          prize_place: ["1st", "2nd", "3rd"][i],
          amount_pence: prizeAmounts[i],
          expires_at: expiresAt.toISOString(),
        });

        // Send claim email
        if (info?.email && process.env.RESEND_API_KEY) {
          try {
            await sendWinnerClaimEmail(
              info.email,
              info.name,
              ["1st", "2nd", "3rd"][i],
              prizeAmounts[i],
              winningNumbers[i],
              claimToken
            );
          } catch (err) {
            console.error(`Failed to send claim email to ${info.email}:`, err);
          }
        }
      }
    }
  }

  // Build participant list for draw results emails
  const profileNumbers = new Map<string, number[]>();
  for (const sel of selections) {
    const existing = profileNumbers.get(sel.profile_id) || [];
    profileNumbers.set(sel.profile_id, [...existing, ...sel.numbers]);
  }

  const participants: { email: string; numbers: number[]; name?: string }[] = [];
  for (const [profileId, numbers] of profileNumbers) {
    const info = emailMap.get(profileId);
    if (info?.email) {
      participants.push({ email: info.email, numbers, name: info.name });
    }
  }

  // Send draw results emails
  if (participants.length > 0 && process.env.RESEND_API_KEY) {
    try {
      await sendDrawResults(participants, winningNumbers, prizes, new Date().toISOString().split("T")[0]);
    } catch (err) {
      console.error("Failed to send draw emails:", err);
    }
  }

  // Expire one-off entries after the draw (they're only valid for one week)
  // One-off entries have a checkout session ID (cs_live_/cs_test_) as stripe_subscription_id,
  // while subscriptions have a subscription ID (sub_)
  const { data: oneOffEntries, error: expireErr } = await supabase
    .from("number_selections")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("club_id", CLUB_ID)
    .eq("status", "active")
    .like("stripe_subscription_id", "cs_%")
    .select("id, numbers");

  if (expireErr) {
    console.error("Failed to expire one-off entries:", expireErr);
  } else if (oneOffEntries && oneOffEntries.length > 0) {
    const expiredNumbers = oneOffEntries.flatMap((e: any) => e.numbers);
    console.log(`Expired ${oneOffEntries.length} one-off entries after draw (numbers: ${expiredNumbers.join(", ")})`);
  }

  // Build winners for response
  const winners = winningNumbers.map((n, i) => {
    const ownerIds = ownerMap.get(n) || [];
    const ownerNames = ownerIds.map((id) => emailMap.get(id)?.name || "Unknown");
    return {
      place: ["1st", "2nd", "3rd"][i],
      number: n,
      prize: prizeAmounts[i],
      owners: ownerNames,
    };
  });

  return NextResponse.json({
    success: true,
    draw_number: drawNumber,
    draw_id: drawId,
    winning_numbers: winningNumbers,
    total_entries: totalEntries,
    total_pot_pence: totalPotPence,
    prizes,
    winners,
    payouts_created: payoutRecords.length,
    participants_emailed: participants.length,
  });
}
