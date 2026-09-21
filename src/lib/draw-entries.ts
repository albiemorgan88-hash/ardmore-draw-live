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

type DrawSubscriptionUserRow = {
  user_id: string | null;
};

function isOneOffSelection(selection: Pick<DrawSelection, "stripe_subscription_id">) {
  return Boolean(selection.stripe_subscription_id?.startsWith("cs_"));
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

export async function reconcileNumberSelections(supabase: SupabaseClient, clubId: string, userId: string) {
  const { data, error } = await supabase.rpc("reconcile_ardmore_number_selections", {
    p_club_id: clubId,
    p_user_id: userId,
  });
  if (error) throw new Error(`Failed to reconcile draw entries: ${error.message}`);
  if (!data || !Array.isArray(data.numbers) || typeof data.action !== "string") {
    throw new Error("Draw reconciliation returned an invalid result");
  }
  return data as { numbers: number[]; action: string };
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
  let failedUsers = 0;
  for (const userId of userIds) {
    try {
      results.push({ userId, ...(await reconcileNumberSelections(supabase, clubId, userId)) });
    } catch (error) {
      failedUsers++;
      console.error("Draw member reconciliation failed:", error instanceof Error ? error.message : "unknown error");
    }
  }

  const selections = await fetchActiveDrawSelections(supabase, clubId);
  return {
    reconciledUsers: results.length,
    failedUsers,
    results,
    pot: summarizeDrawSelections(selections),
  };
}
