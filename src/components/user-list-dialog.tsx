"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search, MessageSquare, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getDb } from '@/lib/firebase';
import { collection, query, getDocs, where, addDoc, serverTimestamp, or, and } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { UserDetailsDialog } from './user-details-dialog';

export function UserListDialog({ children }: { children: React.ReactNode }) {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        const db = getDb();
        if (!db) return;

        setLoading(true);
        try {
            const usersRef = collection(db, 'users');
            const snapshot = await getDocs(usersRef);
            const fetchedUsers = snapshot.docs
                .map(doc => doc.data() as User)
                .filter(u => u.id !== currentUser?.id); // Exclude current user
            setUsers(fetchedUsers);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleStartDM = async (otherUser: User) => {
        const db = getDb();
        if (!db || !currentUser) return;

        try {
            // 1. Check if DM room already exists
            const roomsRef = collection(db, 'rooms');
            // This is a simplified check. In production, you'd want a more robust way to find existing DMs
            // for example by querying a 'dms' subcollection on the user or using a composite key.
            // For now, we'll just query rooms where both users are members.
            // Firestore array-contains-any doesn't support "contains ALL", so we do client-side filter or creating a unique ID.

            // Simpler approach: Create a unique ID for the DM based on sorted user IDs
            // e.g. "dm_userA_userB"
            const sortedIds = [currentUser.id, otherUser.id].sort();
            const dmRoomId = `dm_${sortedIds.join('_')}`;

            // Check if this room exists by trying to navigate to it or creating it if we use custom IDs.
            // Since we use auto-generated IDs for rooms currently, let's create a new type='dm' room

            // Standard query to find existing DM (inefficient but works for small scale)
            const q = query(
                roomsRef,
                where('type', '==', 'dm'),
                where('memberIds', 'array-contains', currentUser.id)
            );

            const snapshot = await getDocs(q);
            const existingRoom = snapshot.docs.find(doc => {
                const data = doc.data();
                return data.memberIds?.includes(otherUser.id);
            });

            if (existingRoom) {
                setIsOpen(false);
                router.push(`/c/${existingRoom.id}`);
                return;
            }

            // 2. Create new DM room
            const roomRef = await addDoc(roomsRef, {
                name: otherUser.name, // For DM, name can be dynamic per user, but for now use other user's name
                type: 'dm',
                avatar: otherUser.avatar,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                ownerId: currentUser.id,
                memberIds: [currentUser.id, otherUser.id],
                lastMessage: 'Chat started'
            });

            setIsOpen(false);
            router.push(`/c/${roomRef.id}`);

        } catch (error) {
            console.error("Error creating DM:", error);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Contacts Directory</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {loading ? (
                            <p className="text-center text-sm text-muted-foreground p-4">Loading contacts...</p>
                        ) : filteredUsers.length === 0 ? (
                            <p className="text-center text-sm text-muted-foreground p-4">No users found.</p>
                        ) : (
                            filteredUsers.map(u => (
                                <div key={u.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <UserDetailsDialog user={u}>
                                            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                                                <Avatar>
                                                    <AvatarImage src={u.avatar} />
                                                    <AvatarFallback>{u.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium text-sm">{u.name}</div>
                                                    {u.email && <div className="text-xs text-muted-foreground">{u.email}</div>}
                                                    {u.isAnonymous && <div className="text-xs text-muted-foreground italic">Anonymous</div>}
                                                </div>
                                            </div>
                                        </UserDetailsDialog>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => handleStartDM(u)}>
                                        <MessageSquare className="w-4 h-4 mr-2" />
                                        Message
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
