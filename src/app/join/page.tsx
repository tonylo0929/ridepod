import type { Metadata } from "next";
import { WhisperJoinPage } from "@/components/whisperlink/join-page";

export const metadata: Metadata = {
  title: "Join Room | WhisperLink",
  description: "Guest consent and passcode entry for a WhisperLink room.",
};

export default function JoinPage() {
  return <WhisperJoinPage />;
}
