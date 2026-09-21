import { redirect } from "next/navigation";

export const metadata = {
  title: "Office Bearers & Committee | Ardmore Cricket Club",
  description: "Meet the committee and team captains of Ardmore Cricket Club, est. 1879.",
};

export default function CommitteePage() {
  redirect("/about");
}
