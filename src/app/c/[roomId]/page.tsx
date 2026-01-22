"use client";

import ChatLayout from '@/components/chat-layout';
import Sidebar from '@/components/sidebar';
import { useParams } from 'next/navigation';

export default function ChatPage() {
    const params = useParams();
    const roomId = params?.roomId as string;

    if (!roomId) {
        return <div>Loading...</div>;
    }

    return (
        <main className="h-screen w-screen flex overflow-hidden">
            <Sidebar className="hidden md:flex" />
            <div className="flex-1 overflow-hidden w-full">
                <ChatLayout roomId={roomId} />
            </div>
        </main>
    );
}
