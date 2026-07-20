import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { CreatePodChooseType } from "@/components/create-pod-choose-type";

export const metadata: Metadata = {
  title: "Create Ride | RidePod",
  description: "Create a RidePod shared ride.",
};

export default function CreatePage() {
  return (
    <AppShell>
      <CreatePodChooseType />
    </AppShell>
  );
}
