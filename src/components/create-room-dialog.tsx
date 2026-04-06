"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Plus } from 'lucide-react';
import { getDb } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function CreateRoomDialog({ children }: { children?: React.ReactNode }) {
    const { user } = useAuth();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const db = getDb();
        if (!db) return;

        setLoading(true);
        try {
            // Use provided avatar or fallback to a random placeholder
            const finalAvatar = avatarUrl.trim() || PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)].imageUrl;

            const roomRef = await addDoc(collection(db, 'rooms'), {
                name: name.trim() || 'Custom Group',
                avatar: finalAvatar,
                updatedAt: serverTimestamp(),
                lastMessage: 'Room created',
                ownerId: user?.id || null,
                memberIds: user ? [user.id] : [],
                type: 'public'
            });

            setIsOpen(false);
            setName('');
            setAvatarUrl('');

            router.push(`/c/${roomRef.id}`);
        } catch (error) {
            console.error("Error creating room:", error);
            alert("Failed to create room");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button size="icon" variant="ghost" title="New Room">
                        <Plus className="w-5 h-5" />
                        <span className="sr-only">New Chat</span>
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Room</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="room-name">Room Name</Label>
                        <Input
                            id="room-name"
                            placeholder="e.g. Marketing Team"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="room-avatar">Icon URL (optional)</Label>
                        <Input
                            id="room-avatar"
                            type="url"
                            placeholder="https://example.com/icon.png"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Provide a direct link to an image file. Leave empty to use a default icon.
                        </p>
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="mr-2">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !name.trim()}>
                            {loading ? "Creating..." : "Create Room"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
