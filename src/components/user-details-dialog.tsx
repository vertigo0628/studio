"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { MessageSquare, Phone, MapPin, Info, Circle, Share2, Download, Contact, Instagram, Linkedin, Twitter } from 'lucide-react';
import type { User } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { getDb } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

type UserDetailsDialogProps = {
    user: User;
    children: React.ReactNode;
};

export function UserDetailsDialog({ user: targetUser, children }: UserDetailsDialogProps) {
    const { user: currentUser } = useAuth();
    const router = useRouter();

    const handleStartDM = async () => {
        const db = getDb();
        if (!db || !currentUser) return;

        try {
            // Check if DM exists logic (simplified duplicated logic for now, ideally reused)
            const roomsRef = collection(db, 'rooms');
            const q = query(
                roomsRef,
                where('type', '==', 'dm'),
                where('memberIds', 'array-contains', currentUser.id)
            );

            const snapshot = await getDocs(q);
            const existingRoom = snapshot.docs.find(doc => {
                const data = doc.data();
                return data.memberIds?.includes(targetUser.id);
            });

            if (existingRoom) {
                router.push(`/c/${existingRoom.id}`);
                return;
            }

            const roomRef = await addDoc(roomsRef, {
                name: targetUser.name,
                type: 'dm',
                avatar: targetUser.avatar,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                ownerId: currentUser.id,
                memberIds: [currentUser.id, targetUser.id],
                lastMessage: 'Chat started'
            });

            router.push(`/c/${roomRef.id}`);

        } catch (error) {
            console.error("Error starting DM:", error);
        }
    };

    const handleDownloadVCard = () => {
        const vCardData = `BEGIN:VCARD
VERSION:3.0
FN:${targetUser.name}
EMAIL:${targetUser.email || ''}
TEL:${targetUser.phone || ''}
NOTE:${targetUser.about || ''}
PHOTO;VALUE=URI:${targetUser.avatar}
END:VCARD`;

        const blob = new Blob([vCardData], { type: 'text/vcard' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${targetUser.name}.vcf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: targetUser.name,
                    text: `Check out ${targetUser.name} on DuetCast! Phone: ${targetUser.phone || 'N/A'}`,
                    url: window.location.href, // Or a specific profile URL if we had one
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            alert("Web Share API not supported on this device.");
        }
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'online': return 'text-green-500';
            case 'busy': return 'text-red-500';
            case 'away': return 'text-yellow-500';
            case 'offline': return 'text-gray-500';
            default: return 'text-green-500';
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Profile</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-6 py-4">
                    <div className="relative">
                        <Avatar className="w-24 h-24">
                            <AvatarImage src={targetUser.avatar} />
                            <AvatarFallback>{targetUser.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        {targetUser.status && (
                            <div className={`absolute bottom-0 right-0 p-1 bg-background rounded-full border`}>
                                <Circle className={`w-4 h-4 fill-current ${getStatusColor(targetUser.status)}`} />
                            </div>
                        )}
                    </div>

                    <div className="text-center space-y-1">
                        <h2 className="text-2xl font-bold">{targetUser.name}</h2>
                        {targetUser.email && !targetUser.isAnonymous && (
                            <p className="text-sm text-muted-foreground">{targetUser.email}</p>
                        )}
                        {targetUser.status && (
                            <p className={`text-sm font-medium capitalize ${getStatusColor(targetUser.status)}`}>
                                {targetUser.status}
                            </p>
                        )}
                    </div>

                    <div className="w-full space-y-4">
                        {targetUser.about && (
                            <div className="bg-muted/30 p-3 rounded-lg text-sm">
                                <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                                    <Info className="w-4 h-4" />
                                    <span className="font-semibold text-xs uppercase">About</span>
                                </div>
                                <p>{targetUser.about}</p>
                            </div>
                        )}

                        <div className="flex justify-center gap-4">
                            {targetUser.socials?.instagram && (
                                <a href={`https://instagram.com/${targetUser.socials.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-muted rounded-full hover:bg-accent hover:text-pink-500 transition-colors">
                                    <Instagram className="w-5 h-5" />
                                </a>
                            )}
                            {targetUser.socials?.twitter && (
                                <a href={`https://twitter.com/${targetUser.socials.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-muted rounded-full hover:bg-accent hover:text-blue-400 transition-colors">
                                    <Twitter className="w-5 h-5" />
                                </a>
                            )}
                            {targetUser.socials?.linkedin && (
                                <a href={targetUser.socials.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 bg-muted rounded-full hover:bg-accent hover:text-blue-700 transition-colors">
                                    <Linkedin className="w-5 h-5" />
                                </a>
                            )}
                        </div>

                        {targetUser.phone && (
                            <a href={`https://wa.me/${targetUser.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group">
                                <div className="flex items-center gap-3">
                                    <Phone className="w-4 h-4 text-green-600" />
                                    <span className="text-sm font-medium">{targetUser.phone}</span>
                                </div>
                                <div className="text-xs text-green-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                    Chat on WhatsApp
                                </div>
                            </a>
                        )}

                        {currentUser && currentUser.id !== targetUser.id && (
                            <div className="flex gap-2">
                                <Button className="flex-1" onClick={handleStartDM}>
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Message
                                </Button>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" onClick={handleDownloadVCard}>
                                <Contact className="w-4 h-4 mr-2" />
                                Save Contact
                            </Button>
                            <Button variant="outline" onClick={handleShare}>
                                <Share2 className="w-4 h-4 mr-2" />
                                Share
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
