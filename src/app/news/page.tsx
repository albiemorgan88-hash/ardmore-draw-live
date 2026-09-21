import NewsPageClient from "./NewsPageClient";
import { getCricketEuropeArdmoreArticles } from "@/lib/cricketeurope-news";

export const revalidate = 1800;

export default async function NewsPage() {
  const cricketEuropeArticles = await getCricketEuropeArdmoreArticles();
  return <NewsPageClient cricketEuropeArticles={cricketEuropeArticles} />;
}
