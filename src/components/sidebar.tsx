
"use client";

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Plus, MessageSquare } from 'lucide-react';
import { getDb } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Room } from '@/lib/types';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils'; // Assuming cn utility exists

export default function Sidebar() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const router = useRouter();
    const params = useParams();
    const currentRoomId = params?.roomId as string;

    useEffect(() => {
        const db = getDb();
        if (!db) return;

        const roomsRef = collection(db, 'rooms');
        const q = query(roomsRef, orderBy('updatedAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newRooms = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Room[];
            setRooms(newRooms);
        });

        return () => unsubscribe();
    }, []);

    const handleCreateRoom = async () => {
        const db = getDb();
        if (!db) return;
        try {
            // Pick a random avatar for the room
            const randomAvatar = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)].imageUrl;

            const roomRef = await addDoc(collection(db, 'rooms'), {
                name: 'New Chat',
                avatar: randomAvatar,
                updatedAt: serverTimestamp(),
                lastMessage: 'Room created',
            });

            router.push(`/c/${roomRef.id}`);
        } catch (error) {
            console.error("Error creating room:", error);
        }
    };

    return (
        <div className="w-80 border-r h-full flex flex-col bg-muted/20 shrink-0">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10">
                <h2 className="font-bold text-xl">Chats</h2>
                <Button size="icon" variant="ghost" onClick={handleCreateRoom}>
                    <Plus className="w-5 h-5" />
                    <span className="sr-only">New Chat</span>
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {rooms.length === 0 && (
                    <div className="text-center p-8 text-muted-foreground text-sm">
                        No chats yet. Click + to start one.
                    </div>
                )}
                {rooms.map(room => (
                    <Link
                        key={room.id}
                        href={`/c/${room.id}`}
                        className={cn(
                            "flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors",
                            currentRoomId === room.id && "bg-accent"
                        )}
                    >
                        <Avatar>
                            <AvatarImage src={room.avatar} />
                            <AvatarFallback>{room.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 overflow-hidden">
                            <div className="font-semibold truncate">{room.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{room.lastMessage}</div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
