import type { SupabaseClient } from "@supabase/supabase-js";

export const ARDMORE_CLUB_ID = "31846fb2-b120-4815-bd48-e1120342d52e";

export type DrawSelection = {
  id: string;
  profile_id: string;
  numbers: number[] | null;
  assigned_names?: Record<string, string> | null;
  stripe_subscription_id?: string | null;
};

export type DrawPotSummary = {
  totalPence: number;
  totalPounds: string;
  prizePotPounds: string;
  first: string;
  second: string;
  third: string;
  totalNumbers: number;
  members: number;
  progress: number;
  targetPounds: string;
  oneOffNumbers: number;
  subscriptionNumbers: number;
};

type NumberSelectionRow = {
  id: string;
  stripe_subscription_id: string | null;
};

type ActiveSubscriptionRow = {
  stripe_subscription_id: string | null;
  numbers: number[] | null;
  assigned_names: Record<string, string> | null;
};

type DrawSubscriptionUserRow = {
  user_id: string | null;
};

function isOneOffSelection(selection: Pick<DrawSelection, "stripe_subscription_id">) {
  return Boolean(selection.stripe_subscription_id?.startsWith("cs_"));
}

function uniqueNumbers(numbers: number[] | null | undefined) {
  return [...new Set(numbers || [])].sort((a, b) => a - b);
}

export async function fetchActiveDrawSelections(
  supabase: SupabaseClient,
  clubId = ARDMORE_CLUB_ID
): Promise<DrawSelection[]> {
  const { data, error } = await supabase
    .from("number_selections")
    .select("id, profile_id, numbers, assigned_names, stripe_subscription_id")
    .eq("club_id", clubId)
    .eq("status", "active");

  if (error) throw new Error(`Failed to fetch active draw selections: ${error.message}`);
  return (data || []) as DrawSelection[];
}

export function summarizeDrawSelections(selections: DrawSelection[]): DrawPotSummary {
  const totalNumbers = selections.reduce((sum, selection) => sum + (selection.numbers?.length || 0), 0);
  const totalPence = totalNumbers * 100;
  const members = new Set(selections.map((selection) => selection.profile_id)).size;
  const oneOffNumbers = selections
    .filter(isOneOffSelection)
    .reduce((sum, selection) => sum + (selection.numbers?.length || 0), 0);
  const subscriptionNumbers = totalNumbers - oneOffNumbers;

  const prizePot = totalPence / 2;
  const first = Math.floor((totalPence * 25) / 100);
  const second = Math.floor((totalPence * 15) / 100);
  const third = Math.floor((totalPence * 10) / 100);
  const targetPence = 50000;
  const progress = Math.min(100, Math.round((totalPence / targetPence) * 100));

  return {
    totalPence,
    totalPounds: (totalPence / 100).toFixed(2),
    prizePotPounds: (prizePot / 100).toFixed(2),
    first: (first / 100).toFixed(2),
    second: (second / 100).toFixed(2),
    third: (third / 100).toFixed(2),
    totalNumbers,
    members,
    progress,
    targetPounds: "500.00",
    oneOffNumbers,
    subscriptionNumbers,
  };
}

export async function reconcileNumberSelectionsForSubscription(supabase: SupabaseClient, subscriptionId: string) {
  const { data: sub, error } = await supabase
    .from("draw_subscriptions")
    .select("club_id,user_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch subscription ${subscriptionId}: ${error.message}`);
  if (sub?.club_id && sub?.user_id) {
    await reconcileNumberSelections(supabase, sub.club_id, sub.user_id);
  }
}

export async function reconcileNumberSelections(supabase: SupabaseClient, clubId: string, userId: string, currentSubId?: string) {
  const { data: allSubs, error: subError } = await supabase
    .from("draw_subscriptions")
    .select("stripe_subscription_id, numbers, assigned_names")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .eq("status", "active");

  if (subError) throw new Error(`Failed to fetch active subscriptions for ${userId}: ${subError.message}`);

  const { data: existingRows, error: existingError } = await supabase
    .from("number_selections")
    .select("id, stripe_subscription_id")
    .eq("club_id", clubId)
    .eq("profile_id", userId);

  if (existingError) throw new Error(`Failed to fetch number selections for ${userId}: ${existingError.message}`);

  const subscriptionRows = ((existingRows || []) as NumberSelectionRow[]).filter(
    (row) => !String(row.stripe_subscription_id || "").startsWith("cs_")
  );

  if (!allSubs || allSubs.length === 0) {
    for (const row of subscriptionRows) {
      const { error } = await supabase
        .from("number_selections")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", row.id);
      if (error) throw new Error(`Failed to expire subscription selection ${row.id}: ${error.message}`);
    }
    return { numbers: [], action: subscriptionRows.length > 0 ? "expired" : "unchanged" };
  }

  const mergedNumbers = new Set<number>();
  const mergedNames: Record<string, string> = {};
  let representativeSubId = currentSubId;

  for (const sub of (allSubs || []) as ActiveSubscriptionRow[]) {
    representativeSubId ||= sub.stripe_subscription_id || undefined;
    for (const n of uniqueNumbers(sub.numbers)) mergedNumbers.add(n);
    if (sub.assigned_names) Object.assign(mergedNames, sub.assigned_names);
  }

  const numbers = Array.from(mergedNumbers).sort((a, b) => a - b);
  const payload = {
    club_id: clubId,
    profile_id: userId,
    numbers,
    assigned_names: mergedNames,
    status: "active",
    stripe_subscription_id: representativeSubId,
    updated_at: new Date().toISOString(),
  };

  const [primary, ...staleRows] = subscriptionRows;
  for (const row of staleRows) {
    const { error } = await supabase
      .from("number_selections")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) throw new Error(`Failed to expire stale subscription selection ${row.id}: ${error.message}`);
  }

  if (primary?.id) {
    const { error } = await supabase.from("number_selections").update(payload).eq("id", primary.id);
    if (error) throw new Error(`Failed to update number selections for ${userId}: ${error.message}`);
    return { numbers, action: "updated" };
  }

  const { error } = await supabase.from("number_selections").insert(payload);
  if (error) throw new Error(`Failed to insert number selections for ${userId}: ${error.message}`);
  return { numbers, action: "inserted" };
}

export async function reconcileAllDrawSelections(supabase: SupabaseClient, clubId = ARDMORE_CLUB_ID) {
  const { data: subscriptions, error } = await supabase
    .from("draw_subscriptions")
    .select("user_id")
    .eq("club_id", clubId);

  if (error) throw new Error(`Failed to fetch draw subscriptions for reconciliation: ${error.message}`);

  const userIds = [
    ...new Set(
      ((subscriptions || []) as DrawSubscriptionUserRow[])
        .map((sub) => sub.user_id)
        .filter((userId): userId is string => Boolean(userId))
    ),
  ];
  const results = [];
  for (const userId of userIds) {
    results.push({ userId, ...(await reconcileNumberSelections(supabase, clubId, userId)) });
  }

  const selections = await fetchActiveDrawSelections(supabase, clubId);
  return {
    reconciledUsers: results.length,
    results,
    pot: summarizeDrawSelections(selections),
  };
}
