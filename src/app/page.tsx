import type { Metadata } from "next";
import { WhisperLanding } from "@/components/whisperlink/landing";

export const metadata: Metadata = {
  title: "WhisperLink | Private chat by link",
  description: "No app. No phone number. Auto-expiring private chat rooms by link.",
};

export default function RootPage() {
  return <WhisperLanding />;
}
