import { redirect } from "next/navigation";
import { defaultRideGroupSlug } from "@/lib/ride-groups";

export default function RideGroupsIndexPage() {
  redirect(`/ride-groups/${defaultRideGroupSlug}`);
}

