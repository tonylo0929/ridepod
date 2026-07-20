import type { Metadata } from "next";
import { ExpiredRoomState } from "@/components/whisperlink/states";

export const metadata: Metadata = {
  title: "Expired Room Demo | WhisperLink",
  description: "A polished expired-room state for WhisperLink.",
};

export default function DemoExpiredPage() {
  return <ExpiredRoomState />;
}
