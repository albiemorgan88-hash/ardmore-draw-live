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
    return null;
  }
}

// Revalidate every 60 seconds
export const revalidate = 60;

export default async function DrawPage() {
  const potData = await getPotData();

  return <DrawPageClient initialPotData={potData} />;
}
