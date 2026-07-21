import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "RidePod",
  description: "Find and coordinate shared taxi and ride app pods.",
};

export default function RootPage() {
  redirect("/home?tab=one_off");
}
