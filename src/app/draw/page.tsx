import { createClient } from "@supabase/supabase-js";
import DrawPageClient from "./DrawPageClient";

// Server-side data fetching for pot
async function getPotData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: subscriptions, error } = await supabase
    .from("draw_subscriptions")
    .select("user_id, numbers")
    .eq("status", "active");

  if (error) {
    console.error("Failed to fetch pot data:", error);
    return {
      totalPence: 0,
      totalPounds: "0.00",
      first: "0.00",
      second: "0.00",
      third: "0.00",
      totalNumbers: 0,
      members: 0,
      progress: 0,
    };
  }

  const totalNumbers = (subscriptions || []).reduce(
    (sum, sub) => sum + (sub.numbers?.length || 0),
    0
  );
  const totalPence = totalNumbers * 100;
  const members = new Set((subscriptions || []).map((sub) => sub.user_id)).size;

  const first = Math.floor(totalPence * 25 / 100);
  const second = Math.floor(totalPence * 15 / 100);
  const third = Math.floor(totalPence * 10 / 100);
  const progress = Math.min(100, Math.round((totalPence / 50000) * 100));

  return {
    totalPence,
    totalPounds: (totalPence / 100).toFixed(2),
    first: (first / 100).toFixed(2),
    second: (second / 100).toFixed(2),
    third: (third / 100).toFixed(2),
    totalNumbers,
    members,
    progress,
  };
}

// Revalidate every 60 seconds
export const revalidate = 60;

export default async function DrawPage() {
  const potData = await getPotData();

  return <DrawPageClient initialPotData={potData} />;
}
