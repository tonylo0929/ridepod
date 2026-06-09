import { PodChatRoomClient } from "@/app/(app)/chats/[id]/pod-chat-room-client";

export default async function ChatRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <PodChatRoomClient chatId={id} />;
}
