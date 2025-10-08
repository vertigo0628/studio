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
import { useTransition } from "react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Card, CardContent } from "./ui/card";
import { cn } from "@/lib/utils";

type ModerationDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onStartMedia: (media: Media) => void;
};

export default function ModerationDialog({ isOpen, onOpenChange, onStartMedia }: ModerationDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const onShare = (contentType: "audio" | "video") => {
    startTransition(async () => {
      const result = await handleContentModeration(contentType);

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
        const media: Media =
          contentType === "audio"
            ? {
                type: "audio",
                title: "Dreaming On",
                artist: "NEFFEX",
                thumbnail: PlaceHolderImages.find(p => p.id === 'album-art-1')?.imageUrl || '',
              }
            : {
                type: "video",
                title: "The Great Adventure",
                artist: "A-Film",
                thumbnail: PlaceHolderImages.find(p => p.id === 'video-thumbnail-1')?.imageUrl || '',
              };
        onStartMedia(media);
      }
    });
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
            <Card className={cn("hover:bg-accent/50 cursor-pointer transition-colors", isPending && "pointer-events-none opacity-50")} onClick={() => onShare('audio')}>
                <CardContent className="p-6 flex items-center gap-4">
                    <Music className="w-8 h-8 text-primary" />
                    <div>
                        <h3 className="font-semibold">Share Local Audio</h3>
                        <p className="text-sm text-muted-foreground">Broadcast a song from your device.</p>
                    </div>
                </CardContent>
            </Card>
             <Card className={cn("hover:bg-accent/50 cursor-pointer transition-colors", isPending && "pointer-events-none opacity-50")} onClick={() => onShare('video')}>
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
