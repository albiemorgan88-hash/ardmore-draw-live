import { redirect } from "next/navigation";

export const metadata = {
  title: "Ardmore Cricket Club Kit Shop | O'Neills",
  description: "Visit the official Ardmore Cricket Club kit shop on O'Neills.",
};

export default function ShopPage() {
  redirect("https://www.oneills.com/shop-by-team/cricket/ardmore-cricket-club.html");
}
