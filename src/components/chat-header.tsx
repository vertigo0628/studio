"use client";

import { Phone, Video, ScreenShare, Music, Clapperboard } from 'lucide-react';
import UserAvatar from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { User, Media } from '@/lib/types';
import ModerationDialog from './moderation-dialog';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

type ChatHeaderProps = {
  partner: User;
  onStartMedia: (media: Media) => void;
};

export default function ChatHeader({ partner, onStartMedia }: ChatHeaderProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();

    const handleCall = (type: 'audio' | 'video') => {
        toast({
            title: `Starting ${type} call...`,
            description: `Calling ${partner.name}.`,
        });
    };

    return (
        <>
            <div className="p-4 flex items-center justify-between border-b shrink-0">
                <div className="flex items-center gap-4">
                    <UserAvatar user={partner} />
                    <div>
                        <h2 className="text-lg font-bold font-headline">{partner.name}</h2>
                        <p className="text-xs text-green-500 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Online
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setIsDialogOpen(true)} className="text-muted-foreground hover:text-primary">
                        <Music />
                        <span className="sr-only">Share Music</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setIsDialogOpen(true)} className="text-muted-foreground hover:text-primary">
                        <Clapperboard />
                        <span className="sr-only">Share Video</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => toast({ title: "Starting screen share..."})} className="text-muted-foreground hover:text-primary">
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
