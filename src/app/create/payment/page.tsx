import type { Metadata } from "next";
import { WhisperFlowPage } from "@/components/whisperlink/flow-pages";

export const metadata: Metadata = {
  title: "Payment Review | WhisperLink",
  description: "Review payment and room settings before creating a WhisperLink room.",
};

export default function CreatePaymentPage() {
  return <WhisperFlowPage step="payment" />;
}
