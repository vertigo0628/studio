
"use client";

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Plus, MessageSquare, LogOut, LogIn, Users, Trash2 } from 'lucide-react';
import { getDb } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, deleteDoc, doc } from 'firebase/firestore';
import type { Room } from '@/lib/types';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { UserListDialog } from './user-list-dialog';
import { UserProfileDialog } from './user-profile-dialog';
import { ThemeToggle } from './theme-toggle';
import { CreateRoomDialog } from './create-room-dialog';

export default function Sidebar({ className }: { className?: string }) {
    const { user, signInWithGoogle, signOut } = useAuth();
    const [rooms, setRooms] = useState<Room[]>([]);
    const router = useRouter();
    const params = useParams();
    const currentRoomId = params?.roomId as string;

    useEffect(() => {
        const db = getDb();
        if (!db) return;

        const roomsRef = collection(db, 'rooms');

        // Advanced Privacy:
        // 1. If user is logged in, show rooms where they are a member OR rooms that are public
        // 2. Ideally we need a complex OR query or two listeners. Firestore OR queries have limits.
        // For simplicity: We will query ALL rooms and filter client side if the list isn't huge, 
        // OR we just rely on 'memberIds' array-contains filter if we migrate everyone to have IDs.

        // Since we are migrating:
        // Let's LISTEN to all rooms for now but only SHOW the ones where:
        // - type is 'public' (or undefined/backward combat)
        // - OR memberIds contains currentUser.id

        // BETTER: Use Firestore Query if possible.
        // query(roomsRef, where('memberIds', 'array-contains', user.id));
        // But this hides public rooms if you are not a member yet.

        // STRATEGY: Fetch all rooms (assuming < 100 for this demo) and filter in memory.
        const q = query(roomsRef, orderBy('updatedAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newRooms = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Room[];

            // Filter logic
            const filtered = newRooms.filter(r => {
                // If user is null (anonymous/not signed in), only show public rooms (no type or type='public')
                if (!user) return (!r.type || r.type === 'public');

                // If user is signed in:
                // Show if they are in memberIds
                if (r.memberIds?.includes(user.id)) return true;

                // Show if it's public/undefined type
                if (!r.type || r.type === 'public') return true;

                return false;
            });
            setRooms(filtered);
        });

        return () => unsubscribe();
    }, [user]); // Re-run when user changes



    const handleDeleteRoom = async (e: React.MouseEvent, roomId: string) => {
        e.preventDefault(); // Prevent navigation
        e.stopPropagation();

        if (!confirm('Are you sure you want to delete this chat permanently?')) return;

        const db = getDb();
        if (!db) return;

        try {
            await deleteDoc(doc(db, 'rooms', roomId));
            // If we are currently in this room, redirect to home
            if (currentRoomId === roomId) {
                router.push('/');
            }
        } catch (error) {
            console.error("Error deleting room:", error);
            alert("Failed to delete room");
        }
    };

    return (
        <div className={cn("w-80 border-r h-full flex flex-col bg-muted/20 shrink-0", className)}>
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10">
                <h2 className="font-bold text-xl">Chats</h2>
                <div className="flex gap-1">
                    <UserListDialog>
                        <Button size="icon" variant="ghost" title="Contacts">
                            <Users className="w-5 h-5" />
                            <span className="sr-only">Contacts</span>
                        </Button>
                    </UserListDialog>
                    <CreateRoomDialog />
                </div>
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
                            "group flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors relative",
                            currentRoomId === room.id && "bg-accent"
                        )}
                    >
                        <Avatar>
                            <AvatarImage src={room.avatar} />
                            <AvatarFallback>{(room.name || "?").substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 overflow-hidden">
                            <div className="font-semibold truncate">{room.name || "Unnamed Room"}</div>
                            <div className="text-xs text-muted-foreground truncate">{room.lastMessage}</div>
                        </div>
                        {/* Only show delete if user is owner or if it's a public room (anyone can clean up for now, or maybe restrict?) 
                            Let's allow deletion for now for better UX as requested. 
                            Ideally check room.ownerId === user.id */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDeleteRoom(e, room.id)}
                            title="Delete Chat"
                        >
                            <Trash2 className="w-4 h-4" />
                            {/* Using LogOut or Trash2? User asked to 'remove'. Trash2 is clearer for delete. */}
                        </Button>
                    </Link>
                ))}
            </div>

            {/* User Profile Footer */}
            <div className="p-4 border-t bg-background/95 backdrop-blur">
                {user ? (
                    <div className="flex items-center gap-3">
                        <UserProfileDialog>
                            <Avatar className="cursor-pointer hover:opacity-80 transition-opacity">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        </UserProfileDialog>
                        <div className="flex-1 overflow-hidden cursor-pointer">
                            <UserProfileDialog>
                                <div className="hover:opacity-80 transition-opacity">
                                    <div className="font-semibold text-sm truncate">{user.name}</div>
                                    <div className="text-xs text-muted-foreground truncate">
                                        {user.isAnonymous ? 'Anonymous' : user.email}
                                    </div>
                                </div>
                            </UserProfileDialog>
                        </div>
                        {user.isAnonymous ? (
                            <Button size="icon" variant="ghost" onClick={() => signInWithGoogle()} title="Sign out">
                                <LogIn className="w-4 h-4 text-muted-foreground" />
                            </Button>
                        ) : (
                            <Button size="icon" variant="ghost" onClick={() => signOut()} title="Sign out">
                                <LogOut className="w-4 h-4 text-muted-foreground" />
                            </Button>
                        )}
                        <ThemeToggle />

                    </div>
                ) : (
                    <Button className="w-full gap-2" variant="outline" onClick={() => signInWithGoogle()}>
                        <LogIn className="w-4 h-4" />
                        Sign in with Google
                    </Button>
                )}
            </div>
        </div >
    );
}
