import type { Metadata } from "next";
import { ExpiredRoomState } from "@/components/whisperlink/states";

export const metadata: Metadata = {
  title: "Expired Room | WhisperLink",
  description: "Expired room state for WhisperLink.",
};

export default function ExpiredPage() {
  return <ExpiredRoomState />;
}
