import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendDrawResults } from "@/lib/email";
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
  // Auth check
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.DRAW_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

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
  const ownerMap = new Map<number, string[]>(); // number -> profile_ids

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

  // Calculate prizes (in pence)
  const prizes = {
    first: Math.round(totalPotPence * 0.25),
    second: Math.round(totalPotPence * 0.15),
    third: Math.round(totalPotPence * 0.10),
    club: Math.round(totalPotPence * 0.40),
    platform: Math.round(totalPotPence * 0.075),
    fees: Math.round(totalPotPence * 0.025),
  };

  const drawDate = new Date().toISOString().split("T")[0];

  // Get next draw number
  const { data: maxDraw } = await supabase
    .from("draws")
    .select("draw_number")
    .eq("club_id", CLUB_ID)
    .order("draw_number", { ascending: false })
    .limit(1)
    .single();
  const drawNumber = (maxDraw?.draw_number || 0) + 1;

  // Insert draw record
  const { error: drawErr } = await supabase.from("draws").insert({
    club_id: CLUB_ID,
    draw_number: drawNumber,
    status: "drawn",
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
  });

  if (drawErr) {
    console.error("Failed to insert draw:", drawErr);
    // Continue anyway — emails are more important
  }

  // Get participant emails
  const profileIds = [...new Set(selections.map((s) => s.profile_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", profileIds);

  // If profiles table doesn't have email, try auth.users
  let emailMap = new Map<string, { email: string; name: string }>();
  if (profiles && profiles.length > 0 && profiles[0].email) {
    for (const p of profiles) {
      emailMap.set(p.id, { email: p.email, name: p.full_name || "" });
    }
  } else {
    // Fallback: get emails from auth.users via admin API
    const { data: authData } = await supabase.auth.admin.listUsers();
    if (authData?.users) {
      for (const u of authData.users) {
        if (profileIds.includes(u.id)) {
          emailMap.set(u.id, { email: u.email || "", name: u.user_metadata?.full_name || "" });
        }
      }
    }
  }

  // Build participant list for emails
  const participants: { email: string; numbers: number[]; name?: string }[] = [];
  const profileNumbers = new Map<string, number[]>();

  for (const sel of selections) {
    const existing = profileNumbers.get(sel.profile_id) || [];
    profileNumbers.set(sel.profile_id, [...existing, ...sel.numbers]);
  }

  for (const [profileId, numbers] of profileNumbers) {
    const info = emailMap.get(profileId);
    if (info?.email) {
      participants.push({ email: info.email, numbers, name: info.name });
    }
  }

  // Send emails
  if (participants.length > 0 && process.env.RESEND_API_KEY) {
    try {
      await sendDrawResults(participants, winningNumbers, prizes, drawDate);
    } catch (err) {
      console.error("Failed to send draw emails:", err);
    }
  }

  // Find winners
  const winners = winningNumbers.map((n, i) => {
    const ownerIds = ownerMap.get(n) || [];
    const ownerNames = ownerIds.map((id) => emailMap.get(id)?.name || "Unknown");
    return {
      place: ["1st", "2nd", "3rd"][i],
      number: n,
      prize: [prizes.first, prizes.second, prizes.third][i],
      owners: ownerNames,
    };
  });

  return NextResponse.json({
    success: true,
    draw_date: drawDate,
    seed: drawSeed,
    winning_numbers: winningNumbers,
    total_entries: totalEntries,
    total_pot_pence: totalPotPence,
    prizes,
    winners,
    participants_emailed: participants.length,
  });
}
