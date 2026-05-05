import { ChatWindow } from '@/components/ChatWindow';

export default async function ChatPage({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = await params;
  return <ChatWindow recipientId={resolvedParams.userId} />;
}
