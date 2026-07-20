import type { Metadata } from "next";
import { WhisperFlowPage } from "@/components/whisperlink/flow-pages";

export const metadata: Metadata = {
  title: "Choose Duration | WhisperLink",
  description: "Choose how long a WhisperLink room should stay open.",
};

export default function CreateDurationPage() {
  return <WhisperFlowPage step="duration" />;
}
