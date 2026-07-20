import type { Metadata } from "next";
import { WhisperFlowPage } from "@/components/whisperlink/flow-pages";

export const metadata: Metadata = {
  title: "Room Settings | WhisperLink",
  description: "Set title, passcode, message expiry, privacy skin, and export defaults.",
};

export default function CreateSettingsPage() {
  return <WhisperFlowPage step="settings" />;
}
