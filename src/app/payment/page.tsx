import type { Metadata } from "next";
import { WhisperFlowPage } from "@/components/whisperlink/flow-pages";

export const metadata: Metadata = {
  title: "Confirm Room | WhisperLink",
  description: "Confirm paid room creation for WhisperLink.",
};

export default function PaymentPage() {
  return <WhisperFlowPage step="payment" />;
}
