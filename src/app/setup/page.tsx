import type { Metadata } from "next";
import { WhisperFlowPage } from "@/components/whisperlink/flow-pages";

export const metadata: Metadata = {
  title: "Room Setup | WhisperLink",
  description: "Set passcode, export, and privacy skin defaults for a WhisperLink room.",
};

export default function SetupPage() {
  return <WhisperFlowPage step="setup" />;
}
