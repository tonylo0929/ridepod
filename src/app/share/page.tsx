import type { Metadata } from "next";
import { WhisperFlowPage } from "@/components/whisperlink/flow-pages";

export const metadata: Metadata = {
  title: "Generated Link | WhisperLink",
  description: "Copy the generated WhisperLink room link.",
};

export default function SharePage() {
  return <WhisperFlowPage step="share" />;
}
