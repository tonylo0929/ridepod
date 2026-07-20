import type { Metadata } from "next";
import { WhisperFlowPage } from "@/components/whisperlink/flow-pages";

export const metadata: Metadata = {
  title: "Private Link Generated | WhisperLink",
  description: "Copy a generated WhisperLink private room link.",
};

export default function CreateSuccessPage() {
  return <WhisperFlowPage step="success" />;
}
