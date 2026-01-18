"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { UserPlus, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getDb } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from 'firebase/firestore';
import type { User, Room } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

type RoomSettingsDialogProps = {
    room: Room;
    members: User[]; // We need to fetch full user objects for display
    children: React.ReactNode;
};

export function RoomSettingsDialog({ room, members, children }: RoomSettingsDialogProps) {
    const { user: currentUser } = useAuth();
    const [inviteEmail, setInviteEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const isOwner = currentUser?.id === room.ownerId;

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;
        const db = getDb();
        if (!db) return;

        setLoading(true);
        try {
            // Find user by email
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', inviteEmail.trim()));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                alert('User not found!');
                setLoading(false);
                return;
            }

            const foundUser = snapshot.docs[0].data() as User;

            // Add to room memberIds
            const roomRef = doc(db, 'rooms', room.id);
            await updateDoc(roomRef, {
                memberIds: arrayUnion(foundUser.id)
            });

            setInviteEmail('');
            alert(`Added ${foundUser.name} to the room!`);
        } catch (error) {
            console.error("Error inviting user:", error);
            alert('Failed to invite user.');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (userId: string) => {
        const db = getDb();
        if (!db) return;
        if (!confirm('Are you sure you want to remove this member?')) return;

        try {
            const roomRef = doc(db, 'rooms', room.id);
            await updateDoc(roomRef, {
                memberIds: arrayRemove(userId)
            });
        } catch (error) {
            console.error("Error removing member:", error);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Room Members</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {/* Invite Section (Owner Only) */}
                    {isOwner && (
                        <div className="flex gap-2">
                            <Input
                                placeholder="Invite by email..."
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                            />
                            <Button onClick={handleInvite} disabled={loading}>
                                <UserPlus className="w-4 h-4" />
                            </Button>
                        </div>
                    )}

                    {/* Member List */}
                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {members.map(member => (
                            <div key={member.id} className="flex items-center justify-between p-2 rounded-lg border">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={member.avatar} />
                                        <AvatarFallback>{member.name.substring(0, 2)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-medium text-sm">{member.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {member.id === room.ownerId ? 'Owner' : 'Member'}
                                        </div>
                                    </div>
                                </div>
                                {isOwner && member.id !== currentUser?.id && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleRemoveMember(member.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
