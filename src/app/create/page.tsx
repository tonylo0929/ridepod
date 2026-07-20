import type { Metadata } from "next";
import { WhisperFlowPage } from "@/components/whisperlink/flow-pages";

export const metadata: Metadata = {
  title: "Create Room | WhisperLink",
  description: "Create a temporary private room by link.",
};

export default function CreatePage() {
  return <WhisperFlowPage step="pricing" />;
}
