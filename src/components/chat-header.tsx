"use client";

import { Phone, Video, ScreenShare, Music, Clapperboard, Trash2, LogOut } from 'lucide-react';
import UserAvatar from '@/components/user-avatar';
import { UserDetailsDialog } from './user-details-dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { User, Media } from '@/lib/types';
import ModerationDialog from './moderation-dialog';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Settings } from 'lucide-react';
import { RoomSettingsDialog } from './room-settings-dialog';
import { getDb } from '@/lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import type { Room } from '@/lib/types';

type ChatHeaderProps = {
    partner: User;
    onStartMedia: (media: Media) => void;
    onStartCall: (type: 'audio' | 'video') => void;
    onStartScreenShare: () => void;
    roomId: string; // Add roomId to props
    onDeleteChat?: () => void;
};

export default function ChatHeader({ partner, onStartMedia, onStartCall, onStartScreenShare, roomId, onDeleteChat }: ChatHeaderProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [room, setRoom] = useState<Room | null>(null);
    const [members, setMembers] = useState<User[]>([]);
    const { toast } = useToast();

    // Fetch room and members for settings
    useEffect(() => {
        const db = getDb();
        if (!db || !roomId) return;

        const unsubscribe = onSnapshot(doc(db, 'rooms', roomId), async (snapshot) => {
            if (snapshot.exists()) {
                const roomData = { id: snapshot.id, ...snapshot.data() } as Room;
                setRoom(roomData);

                // Fetch full member profiles
                if (roomData.memberIds && roomData.memberIds.length > 0) {
                    const memberPromises = roomData.memberIds.map(async (uid) => {
                        const userDoc = await getDoc(doc(db, 'users', uid));
                        return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } as User : null;
                    });
                    const resolvedMembers = (await Promise.all(memberPromises)).filter(m => m !== null) as User[];
                    setMembers(resolvedMembers);
                }
            }
        });

        return () => unsubscribe();
    }, [roomId]);

    const handleCall = (type: 'audio' | 'video') => {
        toast({
            title: `Starting ${type} call...`,
            description: `Calling ${partner.name}.`,
        });
        onStartCall(type);
    };

    return (
        <>
            <div className="p-4 flex items-center justify-between border-b shrink-0">
                <div className="flex items-center gap-4">
                    <UserDetailsDialog user={partner}>
                        <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity">
                            <UserAvatar user={partner} />
                            <div>
                                <h2 className="text-lg font-bold font-headline">{partner.name}</h2>
                                <p className="text-xs text-green-500 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                    Online
                                </p>
                            </div>
                        </div>
                    </UserDetailsDialog>
                </div>
                <div className="flex items-center gap-1">
                    {room && (
                        <RoomSettingsDialog room={room} members={members}>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                                <Settings className="w-5 h-5" />
                                <span className="sr-only">Room Settings</span>
                            </Button>
                        </RoomSettingsDialog>
                    )}
                    {onDeleteChat && (
                        <Button variant="ghost" size="icon" onClick={() => {
                            if (confirm('Are you sure you want to delete/leave this chat?')) {
                                onDeleteChat();
                            }
                        }} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-5 h-5" />
                            <span className="sr-only">Delete Chat</span>
                        </Button>
                    )}
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    <Button variant="ghost" size="icon" onClick={() => setIsDialogOpen(true)} className="text-muted-foreground hover:text-primary">
                        <Music />
                        <span className="sr-only">Share Music</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setIsDialogOpen(true)} className="text-muted-foreground hover:text-primary">
                        <Clapperboard />
                        <span className="sr-only">Share Video</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onStartScreenShare} className="text-muted-foreground hover:text-primary">
                        <ScreenShare />
                        <span className="sr-only">Share Screen</span>
                    </Button>
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    <Button variant="ghost" size="icon" onClick={() => handleCall('audio')} className="text-muted-foreground hover:text-primary">
                        <Phone />
                        <span className="sr-only">Audio Call</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleCall('video')} className="text-muted-foreground hover:text-primary">
                        <Video />
                        <span className="sr-only">Video Call</span>
                    </Button>
                </div>
            </div>
            <ModerationDialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} onStartMedia={onStartMedia} />
        </>
    );
}
