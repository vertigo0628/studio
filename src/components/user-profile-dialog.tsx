"use client";

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Loader2, Upload, User as UserIcon } from 'lucide-react';

import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export function UserProfileDialog({ children }: { children: React.ReactNode }) {
    const { user, updateUserProfile } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [about, setAbout] = useState(user?.about || '');
    const [status, setStatus] = useState<any>(user?.status || 'online');
    const [instagram, setInstagram] = useState(user?.socials?.instagram || '');
    const [twitter, setTwitter] = useState(user?.socials?.twitter || '');
    const [linkedin, setLinkedin] = useState(user?.socials?.linkedin || '');

    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview immediate
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewAvatar(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!user || !name.trim()) return;

        setIsSaving(true);
        try {
            let avatarUrl = user.avatar;

            // Upload new avatar if selected
            const file = fileInputRef.current?.files?.[0];
            if (file) {
                const filename = `avatars/${user.id}-${Date.now()}`;
                const { data, error } = await supabase.storage
                    .from('media-share') // Reusing existing bucket, ideally separate 'avatars' bucket
                    .upload(filename, file);

                if (error) throw error;

                const { data: { publicUrl } } = supabase.storage
                    .from('media-share')
                    .getPublicUrl(data.path);

                avatarUrl = publicUrl;
            }

            // Update profile with all fields
            await updateUserProfile(name, avatarUrl, phone, about, status, {
                instagram,
                twitter,
                linkedin
            });
            setIsOpen(false);
        } catch (error) {
            console.error("Error saving profile:", error);
            console.error("Error saving profile:", error);
            alert(`Failed to update profile: ${(error as Error).message}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex flex-col items-center gap-4">
                        <Avatar className="w-24 h-24 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => fileInputRef.current?.click()}>
                            <AvatarImage src={previewAvatar || user?.avatar} />
                            <AvatarFallback>{user?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="w-4 h-4 mr-2" />
                            Change Photo
                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="name">Display Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="phone">Phone / WhatsApp</Label>
                        <Input
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+1 234 567 890"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="status">Status</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="online">Online</SelectItem>
                                <SelectItem value="busy">Busy</SelectItem>
                                <SelectItem value="away">Away</SelectItem>
                                <SelectItem value="offline">Offline</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="about">About Me</Label>
                        <Textarea
                            id="about"
                            value={about}
                            onChange={(e) => setAbout(e.target.value)}
                            placeholder="Tell us a bit about yourself..."
                            className="max-h-[100px]"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="instagram">Instagram</Label>
                            <Input
                                id="instagram"
                                value={instagram}
                                onChange={(e) => setInstagram(e.target.value)}
                                placeholder="@username"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="twitter">X (Twitter)</Label>
                            <Input
                                id="twitter"
                                value={twitter}
                                onChange={(e) => setTwitter(e.target.value)}
                                placeholder="@username"
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="linkedin">LinkedIn</Label>
                        <Input
                            id="linkedin"
                            value={linkedin}
                            onChange={(e) => setLinkedin(e.target.value)}
                            placeholder="Profile URL"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
