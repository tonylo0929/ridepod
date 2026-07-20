import type { Metadata } from "next";
import { WhisperChatRoom } from "@/components/whisperlink/chat-room";
import { demoRoom } from "@/lib/whisperlink";

export const metadata: Metadata = {
  title: "Private Room | WhisperLink",
  description: "Active WhisperLink room with seeded messages and privacy skins.",
};

export default function RoomPage() {
  return <WhisperChatRoom room={demoRoom} />;
}
