import type { Metadata } from "next";
import { WhisperDemoFlow } from "@/components/whisperlink/demo-flow";

export const metadata: Metadata = {
  title: "Founder Demo | WhisperLink",
  description: "A guided WhisperLink demo flow from duration selection to generated private room link.",
};

export default function DemoPage() {
  return <WhisperDemoFlow />;
}
