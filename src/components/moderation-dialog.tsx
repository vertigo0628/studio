"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Music, Video, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { handleContentModeration } from "@/app/actions";
import type { Media } from "@/lib/types";
import { useTransition, useRef } from "react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Card, CardContent } from "./ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type ModerationDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onStartMedia: (media: Media) => void;
};

export default function ModerationDialog({ isOpen, onOpenChange, onStartMedia }: ModerationDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaTypeRef = useRef<"audio" | "video">("audio");

  const onShareClick = (type: "audio" | "video") => {
    mediaTypeRef.current = type;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    startTransition(async () => {
      try {
        // 1. Upload to Supabase
        const filename = `${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('media-share')
          .upload(filename, file);

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('media-share')
          .getPublicUrl(uploadData.path);

        // 3. Moderate Content
        const result = await handleContentModeration(mediaTypeRef.current, publicUrl);

        onOpenChange(false);

        if (result.isFlagged) {
          toast({
            variant: "destructive",
            title: "Content Moderation Warning",
            description: `This content may be inappropriate. Reason: ${result.reason}`,
            duration: 9000,
          });
        } else {
          toast({
            title: "Content Approved",
            description: "Starting your broadcast now.",
          });
          const media: Media = {
            type: mediaTypeRef.current,
            title: file.name,
            artist: "Shared via DuetCast",
            thumbnail: mediaTypeRef.current === 'audio'
              ? PlaceHolderImages.find(p => p.id === 'album-art-1')?.imageUrl || ''
              : PlaceHolderImages.find(p => p.id === 'video-thumbnail-1')?.imageUrl || '',
            url: publicUrl,
          };
          onStartMedia(media);
        }
      } catch (error: any) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Something went wrong.",
        });
        onOpenChange(false);
      }
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share Media</DialogTitle>
          <DialogDescription>
            Choose what you want to share. Your content will be scanned for appropriateness before broadcasting.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="audio/*,video/*"
            onChange={handleFileChange}
          />
          <Card className={cn("hover:bg-accent/50 cursor-pointer transition-colors", isPending && "pointer-events-none opacity-50")} onClick={() => onShareClick('audio')}>
            <CardContent className="p-6 flex items-center gap-4">
              <Music className="w-8 h-8 text-primary" />
              <div>
                <h3 className="font-semibold">Share Local Audio</h3>
                <p className="text-sm text-muted-foreground">Broadcast a song from your device.</p>
              </div>
            </CardContent>
          </Card>
          <Card className={cn("hover:bg-accent/50 cursor-pointer transition-colors", isPending && "pointer-events-none opacity-50")} onClick={() => onShareClick('video')}>
            <CardContent className="p-6 flex items-center gap-4">
              <Video className="w-8 h-8 text-primary" />
              <div>
                <h3 className="font-semibold">Share Local Video</h3>
                <p className="text-sm text-muted-foreground">Stream a video from your device.</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isPending ? 'Scanning...' : 'Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
