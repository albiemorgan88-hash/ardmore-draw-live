import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendAdminDrawCompletedNotification, sendDrawResults } from "@/lib/email";
import crypto from "crypto";

const CLUB_ID = "31846fb2-b120-4815-bd48-e1120342d52e";
const LEGACY_SPLIT_SELECTION_IDS_BY_NUMBER = new Map<number, Set<string>>([
  [97, new Set(["a99fefb6-3b32-4f3f-a8f0-626968727957", "6c517b98-abe2-4fe2-81d6-3b04228d1f25"])],
]);

function splitPrizePence(total: number, count: number, index: number): number {
  if (count <= 1) return total;
  const base = Math.floor(total / count);
  const remainder = total % count;
  return base + (index < remainder ? 1 : 0);
}

function isAllowedLegacySplit(number: number, selectionIds: string[]): boolean {
  const allowedSelectionIds = LEGACY_SPLIT_SELECTION_IDS_BY_NUMBER.get(number);
  return Boolean(
    allowedSelectionIds &&
      selectionIds.length === allowedSelectionIds.size &&
      selectionIds.every((id) => allowedSelectionIds.has(id))
  );
}

function getLondonDrawWindow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";
  const weekday = value("weekday");
  const hour = Number(value("hour"));
  const minute = Number(value("minute"));
  const isFriday = weekday === "Fri";
  const isAfterSeven = hour > 19 || (hour === 19 && minute >= 0);

  return {
    allowed: isFriday && isAfterSeven,
    weekday,
    hour,
    minute,
    londonTime: `${weekday} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

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

  const force = req.nextUrl.searchParams.get("force") === "true";
  const window = getLondonDrawWindow();
  if (!force && !window.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Draw locked until Friday 7PM Europe/London",
        london_time: window.londonTime,
        force_available: true,
      },
      { status: 409 }
    );
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
    .neq("status", "cancelled")
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

  // Get all active selections for the club (including assigned names)
  const { data: selections, error: selErr } = await supabase
    .from("number_selections")
    .select("id, profile_id, numbers, assigned_names")
    .eq("club_id", CLUB_ID)
    .eq("status", "active");

  if (selErr) {
    return NextResponse.json({ error: "Failed to fetch selections", details: selErr }, { status: 500 });
  }

  if (!selections || selections.length === 0) {
    return NextResponse.json({ error: "No entries this week" }, { status: 400 });
  }

  // Build number pool, ownership map, and number-to-name map
  const allNumbers: number[] = [];
  const ownerMap = new Map<number, string[]>();
  const selectionIdMap = new Map<number, string[]>();
  const numberNameMap = new Map<number, string>(); // number → display name (assigned name or profile name)

  for (const sel of selections) {
    const names: Record<string, string> = sel.assigned_names || {};
    for (const n of sel.numbers) {
      allNumbers.push(n);
      const owners = ownerMap.get(n) || [];
      owners.push(sel.profile_id);
      ownerMap.set(n, owners);
      const selectionIds = selectionIdMap.get(n) || [];
      selectionIds.push(sel.id);
      selectionIdMap.set(n, selectionIds);
      // Use assigned name if available (e.g. "Niamh McLoughlin" when Harry buys for Niamh)
      if (names[String(n)]) {
        numberNameMap.set(n, names[String(n)]);
      }
    }
  }

  const duplicateActiveNumbers = [...ownerMap.entries()]
    .filter(([, owners]) => owners.length > 1)
    .map(([number]) => number)
    .sort((a, b) => a - b);
  const unsupportedDuplicateNumbers = duplicateActiveNumbers.filter(
    (number) => !isAllowedLegacySplit(number, selectionIdMap.get(number) || [])
  );

  if (unsupportedDuplicateNumbers.length > 0) {
    return NextResponse.json(
      {
        error: "Duplicate active draw numbers require manual resolution before drawing",
        duplicate_numbers: unsupportedDuplicateNumbers,
        legacy_split_numbers: [...LEGACY_SPLIT_SELECTION_IDS_BY_NUMBER.keys()],
      },
      { status: 409 }
    );
  }

  if (duplicateActiveNumbers.length > 0) {
    console.warn(`Proceeding with legacy split draw number(s): ${duplicateActiveNumbers.join(", ")}`);
  }

  const totalEntries = allNumbers.length;
  const totalPotPence = totalEntries * 100; // £1 per number

  // Generate provably fair seed
  const drawSeed = crypto.randomUUID();
  // Draw unique numbers, not duplicate paid rows. If legacy number 97 exists twice, it
  // should have one chance to win and the prize should be split only if it is drawn.
  const drawPool = [...new Set(allNumbers)];
  const winningNumbers = pickWinners(drawPool, 3, drawSeed);

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

  const emailMap = new Map<string, { email: string; name: string; connectId?: string; connectStatus?: string }>();
  if (profiles) {
    for (const p of profiles) {
      emailMap.set(p.id, { 
        email: p.email || "", 
        name: p.full_name || "",
        connectId: p.stripe_connect_id || undefined,
        connectStatus: p.stripe_connect_status || undefined,
      });
    }
  }

  const missingProfileEmails = profileIds.filter((id) => !emailMap.get(id)?.email);
  if (missingProfileEmails.length > 0) {
    const { data: authData } = await supabase.auth.admin.listUsers();
    if (authData?.users) {
      for (const u of authData.users) {
        if (profileIds.includes(u.id)) {
          const existing = emailMap.get(u.id);
          emailMap.set(u.id, {
            email: existing?.email || u.email || "",
            name: existing?.name || u.user_metadata?.full_name || "",
            connectId: existing?.connectId,
            connectStatus: existing?.connectStatus,
          });
        }
      }
    }
  }

  // Create payout records for each recipient
  const payoutRecords = [];

  // Winner payouts
  const prizeAmounts = [prizes.first, prizes.second, prizes.third];
  const prizeTypes: Array<"winner_1st" | "winner_2nd" | "winner_3rd"> = ["winner_1st", "winner_2nd", "winner_3rd"];
  const prizeShareByProfileAndNumber = new Map<string, number>();

  for (let i = 0; i < winningNumbers.length; i++) {
    const ownerIds = ownerMap.get(winningNumbers[i]) || [];
    for (let ownerIndex = 0; ownerIndex < ownerIds.length; ownerIndex++) {
      const ownerId = ownerIds[ownerIndex];
      const info = emailMap.get(ownerId);
      const amountPence = splitPrizePence(prizeAmounts[i], ownerIds.length, ownerIndex);
      prizeShareByProfileAndNumber.set(`${ownerId}:${winningNumbers[i]}`, amountPence);
      payoutRecords.push({
        draw_id: drawId,
        club_id: CLUB_ID,
        recipient_type: prizeTypes[i],
        recipient_profile_id: ownerId,
        recipient_connect_id: info?.connectStatus === "active" ? info.connectId : null,
        recipient_name: info?.name || null,
        amount_pence: amountPence,
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

  // Insert all payout records. This is required before any emails/expiry side effects.
  const { error: payoutErr } = await supabase.from("payouts").insert(payoutRecords);
  if (payoutErr) {
    console.error("Failed to insert payout records:", payoutErr);
    await supabase.from("draws").update({ status: "cancelled" }).eq("id", drawId);
    return NextResponse.json(
      { error: "Failed to create payout records; draw side effects were not sent", details: payoutErr.message },
      { status: 500 }
    );
  }

  // Create claim tokens for winners (for record keeping) but DO NOT send separate claim emails
  // Winners are notified in the single draw results email — no duplicate emails
  for (let i = 0; i < winningNumbers.length; i++) {
    const ownerIds = ownerMap.get(winningNumbers[i]) || [];
    for (const ownerId of ownerIds) {
      const info = emailMap.get(ownerId);
      if (!info?.connectId || info?.connectStatus !== "active") {
        const claimToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 14);

        const { error: claimErr } = await supabase.from("claim_tokens").insert({
          draw_id: drawId,
          profile_id: ownerId,
          token: claimToken,
          winning_number: winningNumbers[i],
          prize_place: ["1st", "2nd", "3rd"][i],
          amount_pence: prizeShareByProfileAndNumber.get(`${ownerId}:${winningNumbers[i]}`) || prizeAmounts[i],
          expires_at: expiresAt.toISOString(),
        });

        if (claimErr) {
          console.error("Failed to insert claim token:", claimErr);
          await supabase.from("draws").update({ status: "cancelled" }).eq("id", drawId);
          return NextResponse.json(
            { error: "Failed to create winner claim token; draw side effects were not sent", details: claimErr.message },
            { status: 500 }
          );
        }
        // No separate email — handled by sendDrawResults
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

  // Backfill numberNameMap with profile names where no assigned name exists
  for (const [num, ownerIds] of ownerMap) {
    if (!numberNameMap.has(num)) {
      const names = ownerIds.map((id) => emailMap.get(id)?.name || "").filter(Boolean);
      if (names.length > 0) numberNameMap.set(num, names.join(", "));
    }
  }

  // Build winner display names for the email
  const winnerNames = winningNumbers.map((n) => {
    return numberNameMap.get(n) || "Unknown";
  });

  // Send result emails to winners only. Non-winners are not emailed from the draw job.
  const winningProfileIds = new Set<string>();
  for (const winningNumber of winningNumbers) {
    for (const ownerId of ownerMap.get(winningNumber) || []) {
      winningProfileIds.add(ownerId);
    }
  }

  const winnerParticipants = participants.filter((participant) => {
    for (const [profileId, numbers] of profileNumbers) {
      const info = emailMap.get(profileId);
      if (info?.email === participant.email && winningProfileIds.has(profileId)) {
        return numbers.some((number) => winningNumbers.includes(number));
      }
    }
    return false;
  });

  const winnerPrizeSharesByEmail: Record<string, Record<number, number>> = {};
  for (const [profileId, numbers] of profileNumbers) {
    const info = emailMap.get(profileId);
    if (!info?.email) continue;
    for (const number of numbers) {
      const share = prizeShareByProfileAndNumber.get(`${profileId}:${number}`);
      if (share !== undefined) {
        winnerPrizeSharesByEmail[info.email] ||= {};
        winnerPrizeSharesByEmail[info.email][number] = share;
      }
    }
  }

  if (winnerParticipants.length > 0 && process.env.RESEND_API_KEY) {
    try {
      await sendDrawResults(winnerParticipants, winningNumbers, prizes, new Date().toISOString().split("T")[0], winnerNames, winnerPrizeSharesByEmail);
    } catch (err) {
      console.error("Failed to send winner draw emails:", err);
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
    const expiredNumbers = (oneOffEntries as { numbers: number[] | null }[]).flatMap((entry) => entry.numbers || []);
    console.log(`Expired ${oneOffEntries.length} one-off entries after draw (numbers: ${expiredNumbers.join(", ")})`);
  }

  // Build winners for response — use assigned name first, then profile name
  const winners = winningNumbers.map((n, i) => {
    const ownerIds = ownerMap.get(n) || [];
    const displayName = numberNameMap.get(n) || ownerIds.map((id) => emailMap.get(id)?.name || "Unknown").join(", ");
    return {
      place: ["1st", "2nd", "3rd"][i],
      number: n,
      prize: prizeAmounts[i],
      owners: ownerIds.map((id) => emailMap.get(id)?.name || "Unknown"),
      displayName,
      split: ownerIds.length > 1,
      prize_shares: ownerIds.map((id) => ({
        owner: emailMap.get(id)?.name || "Unknown",
        amount_pence: prizeShareByProfileAndNumber.get(`${id}:${n}`) || prizeAmounts[i],
      })),
    };
  });

  if (process.env.RESEND_API_KEY) {
    try {
      await sendAdminDrawCompletedNotification({
        drawNumber,
        drawId,
        drawDate: new Date().toISOString().split("T")[0],
        winningNumbers,
        totalEntries,
        potAmountPence: totalPotPence,
        prizes,
        winners,
        payoutsCreated: payoutRecords.length,
        participantsEmailed: winnerParticipants.length,
      });
    } catch (err) {
      console.error("Failed to send admin draw notification:", err);
    }
  }

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
    participants_emailed: winnerParticipants.length,
    email_policy: "winner_only",
  });
}
