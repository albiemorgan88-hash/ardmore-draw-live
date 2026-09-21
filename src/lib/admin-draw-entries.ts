import type { SupabaseClient } from "@supabase/supabase-js";
import { ARDMORE_CLUB_ID } from "@/lib/draw-entries";

export type DrawEntrySelection = {
  selection_id: string;
  profile_id: string;
  owner_name: string;
  owner_email: string;
  numbers: number[];
  number_count: number;
  assigned_names: Record<string, string>;
  entry_type: "subscription" | "one_off";
  status: string;
  stripe_reference: string;
  created_at: string;
  updated_at: string;
};

export type DrawEntryNumberRow = {
  number: number;
  assigned_name: string;
  owner_name: string;
  owner_email: string;
  entry_type: "subscription" | "one_off";
  selection_status: string;
  selection_id: string;
  profile_id: string;
  stripe_reference: string;
  selection_created_at: string;
  selection_updated_at: string;
  duplicate_count: number;
};

export type DrawEntryReport = {
  generated_at: string;
  summary: {
    active_selections: number;
    active_numbers: number;
    unique_numbers: number;
    duplicate_numbers: number[];
    subscription_numbers: number;
    one_off_numbers: number;
  };
  selections: DrawEntrySelection[];
  number_rows: DrawEntryNumberRow[];
};

type NumberSelectionRow = {
  id: string;
  profile_id: string;
  numbers: number[] | null;
  assigned_names: Record<string, string> | null;
  status: string | null;
  stripe_subscription_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
};

function uniqueSortedNumbers(numbers: number[] | null | undefined) {
  return [...new Set(numbers || [])].sort((a, b) => a - b);
}

function entryType(stripeReference: string): "subscription" | "one_off" {
  return stripeReference.startsWith("cs_") ? "one_off" : "subscription";
}

export async function fetchActiveDrawEntryReport(supabase: SupabaseClient): Promise<DrawEntryReport> {
  const { data, error } = await supabase
    .from("number_selections")
    .select("id, profile_id, numbers, assigned_names, status, stripe_subscription_id, created_at, updated_at")
    .eq("club_id", ARDMORE_CLUB_ID)
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch active draw entries: ${error.message}`);
  }

  const selectionRows = (data || []) as NumberSelectionRow[];
  const profileIds = [...new Set(selectionRows.map((selection) => selection.profile_id).filter(Boolean))];
  const { data: profiles, error: profileError } = profileIds.length
    ? await supabase.from("profiles").select("id, email, full_name").in("id", profileIds)
    : { data: [], error: null };

  if (profileError) {
    throw new Error(`Failed to fetch draw entry profiles: ${profileError.message}`);
  }

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile as ProfileRow]));
  const selections: DrawEntrySelection[] = [];
  const numberRowsWithoutDuplicates: Omit<DrawEntryNumberRow, "duplicate_count">[] = [];
  const numberCounts = new Map<number, number>();

  for (const selection of selectionRows) {
    const profile = profileMap.get(selection.profile_id);
    const numbers = uniqueSortedNumbers(selection.numbers);
    const assignedNames = selection.assigned_names || {};
    const stripeReference = selection.stripe_subscription_id || "";
    const type = entryType(stripeReference);
    const ownerName = profile?.full_name || "";
    const ownerEmail = profile?.email || "";

    selections.push({
      selection_id: selection.id,
      profile_id: selection.profile_id,
      owner_name: ownerName,
      owner_email: ownerEmail,
      numbers,
      number_count: numbers.length,
      assigned_names: assignedNames,
      entry_type: type,
      status: selection.status || "",
      stripe_reference: stripeReference,
      created_at: selection.created_at || "",
      updated_at: selection.updated_at || "",
    });

    for (const number of numbers) {
      numberCounts.set(number, (numberCounts.get(number) || 0) + 1);
      numberRowsWithoutDuplicates.push({
        number,
        assigned_name: assignedNames[String(number)] || "",
        owner_name: ownerName,
        owner_email: ownerEmail,
        entry_type: type,
        selection_status: selection.status || "",
        selection_id: selection.id,
        profile_id: selection.profile_id,
        stripe_reference: stripeReference,
        selection_created_at: selection.created_at || "",
        selection_updated_at: selection.updated_at || "",
      });
    }
  }

  const number_rows = numberRowsWithoutDuplicates
    .map((row) => ({
      ...row,
      duplicate_count: numberCounts.get(row.number) || 0,
    }))
    .sort((a, b) => a.number - b.number || a.owner_name.localeCompare(b.owner_name));

  const duplicate_numbers = [...numberCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([number]) => number)
    .sort((a, b) => a - b);

  const summary = {
    active_selections: selections.length,
    active_numbers: number_rows.length,
    unique_numbers: numberCounts.size,
    duplicate_numbers,
    subscription_numbers: number_rows.filter((row) => row.entry_type === "subscription").length,
    one_off_numbers: number_rows.filter((row) => row.entry_type === "one_off").length,
  };

  return {
    generated_at: new Date().toISOString(),
    summary,
    selections,
    number_rows,
  };
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function drawEntryReportToCsv(report: DrawEntryReport) {
  const rows: unknown[][] = [
    ["Ardmore Cricket Club - Active Draw List"],
    ["Generated at", report.generated_at],
    ["Active selections", report.summary.active_selections],
    ["Active numbers", report.summary.active_numbers],
    ["Unique numbers", report.summary.unique_numbers],
    ["Duplicate numbers", report.summary.duplicate_numbers.join(", ")],
    [],
    [
      "Number",
      "Duplicate count",
      "Assigned name",
      "Owner name",
      "Owner email",
      "Entry type",
      "Status",
      "Selection ID",
      "Profile ID",
      "Stripe reference",
      "Updated at",
      "Created at",
    ],
  ];

  for (const row of report.number_rows) {
    rows.push([
      row.number,
      row.duplicate_count,
      row.assigned_name,
      row.owner_name,
      row.owner_email,
      row.entry_type,
      row.selection_status,
      row.selection_id,
      row.profile_id,
      row.stripe_reference,
      row.selection_updated_at,
      row.selection_created_at,
    ]);
  }

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}
