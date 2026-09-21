import DrawPageClient from "./DrawPageClient";
import { createServiceClient } from "@/lib/supabase";
import { fetchActiveDrawSelections, summarizeDrawSelections } from "@/lib/draw-entries";

// Server-side data fetching for pot
async function getPotData() {
  try {
    const supabase = createServiceClient();
    return summarizeDrawSelections(await fetchActiveDrawSelections(supabase));
  } catch (error) {
    console.error("Failed to fetch pot data:", error);
    return {
      totalPence: 0,
      totalPounds: "0.00",
      prizePotPounds: "0.00",
      first: "0.00",
      second: "0.00",
      third: "0.00",
      totalNumbers: 0,
      members: 0,
      progress: 0,
      targetPounds: "500.00",
      oneOffNumbers: 0,
      subscriptionNumbers: 0,
    };
  }
}

// Revalidate every 60 seconds
export const revalidate = 60;

export default async function DrawPage() {
  const potData = await getPotData();

  return <DrawPageClient initialPotData={potData} />;
}
