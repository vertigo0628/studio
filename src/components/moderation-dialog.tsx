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
import { Music, Video, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

        onOpenChange(false);

        // NO MODERATION - Free Expression Mode 🔥
        toast({
          title: "Media Ready",
          description: "Starting your broadcast now. Share freely!",
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
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Share Media
          </DialogTitle>
          <DialogDescription>
            Share any audio or video. Express yourself freely! 🎉
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
          <Card className={cn("hover:bg-accent/50 cursor-pointer transition-colors border-2 hover:border-primary", isPending && "pointer-events-none opacity-50")} onClick={() => onShareClick('audio')}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                <Music className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Share Audio</h3>
                <p className="text-sm text-muted-foreground">Broadcast music, podcasts, or any audio.</p>
              </div>
            </CardContent>
          </Card>
          <Card className={cn("hover:bg-accent/50 cursor-pointer transition-colors border-2 hover:border-primary", isPending && "pointer-events-none opacity-50")} onClick={() => onShareClick('video')}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Share Video</h3>
                <p className="text-sm text-muted-foreground">Stream movies, clips, or any video.</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isPending ? 'Uploading...' : 'Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
