import type { Metadata } from "next";
import { WhisperChatRoom } from "@/components/whisperlink/chat-room";
import { demoRoom } from "@/lib/whisperlink";

export const metadata: Metadata = {
  title: "Active Room Demo | WhisperLink",
  description: "A seeded active WhisperLink room with privacy skin switching and room controls.",
};

export default function DemoRoomPage() {
  return <WhisperChatRoom room={demoRoom} />;
}
