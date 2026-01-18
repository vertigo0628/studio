
import ChatLayout from '@/components/chat-layout';
import Sidebar from '@/components/sidebar';

type Props = {
    params: Promise<{ roomId: string }>;
};

export default async function ChatPage({ params }: Props) {
    const resolvedParams = await params;

    return (
        <main className="h-screen w-screen flex overflow-hidden">
            <Sidebar />
            <div className="flex-1 overflow-hidden">
                <ChatLayout roomId={resolvedParams.roomId} />
            </div>
        </main>
    );
}
