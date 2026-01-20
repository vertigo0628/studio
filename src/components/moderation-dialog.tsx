"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Link2, Radio, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Media } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { UrlMediaInput, getEmbedUrl, isEmbedUrl } from "./url-media-input";
import { TusUploader } from "./tus-uploader";
import { P2PStreamHost } from "./p2p-stream-host";

type ModerationDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onStartMedia: (media: Media) => void;
  roomId?: string;
};

export default function ModerationDialog({ isOpen, onOpenChange, onStartMedia, roomId }: ModerationDialogProps) {
  const { toast } = useToast();

  // Handle URL streaming
  const handleUrlReady = (url: string, type: 'audio' | 'video', title: string) => {
    const media: Media = {
      type,
      title,
      artist: "Streaming from URL",
      thumbnail: type === 'audio'
        ? PlaceHolderImages.find(p => p.id === 'album-art-1')?.imageUrl || ''
        : PlaceHolderImages.find(p => p.id === 'video-thumbnail-1')?.imageUrl || '',
      url: isEmbedUrl(url) ? getEmbedUrl(url) : url,
      sourceType: 'url',
      isEmbed: isEmbedUrl(url),
    };

    toast({
      title: "Starting Stream",
      description: `Now playing: ${title}`,
    });

    onStartMedia(media);
    onOpenChange(false);
  };

  // Handle file upload complete
  const handleUploadComplete = (url: string, filename: string, type: 'audio' | 'video') => {
    const media: Media = {
      type,
      title: filename,
      artist: "Shared via DuetCast",
      thumbnail: type === 'audio'
        ? PlaceHolderImages.find(p => p.id === 'album-art-1')?.imageUrl || ''
        : PlaceHolderImages.find(p => p.id === 'video-thumbnail-1')?.imageUrl || '',
      url,
      sourceType: 'upload',
      tempFile: true, // Mark for auto-delete
    };

    toast({
      title: "Upload Complete",
      description: "Starting your broadcast now!",
    });

    onStartMedia(media);
    onOpenChange(false);
  };

  // Handle P2P streaming start
  const handleP2PStart = (file: File) => {
    const media: Media = {
      type: file.type.startsWith('audio/') ? 'audio' : 'video',
      title: file.name,
      artist: "Streaming from device",
      thumbnail: file.type.startsWith('audio/')
        ? PlaceHolderImages.find(p => p.id === 'album-art-1')?.imageUrl || ''
        : PlaceHolderImages.find(p => p.id === 'video-thumbnail-1')?.imageUrl || '',
      url: '', // Will be handled by WebRTC
      sourceType: 'p2p',
    };

    toast({
      title: "P2P Stream Started",
      description: "Streaming directly from your device to viewers",
    });

    onStartMedia(media);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Share Media
          </DialogTitle>
          <DialogDescription>
            Choose how you want to share media with the room
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="url" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="url" className="gap-2">
              <Link2 className="w-4 h-4" />
              <span className="hidden sm:inline">URL</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload</span>
            </TabsTrigger>
            <TabsTrigger value="p2p" className="gap-2">
              <Radio className="w-4 h-4" />
              <span className="hidden sm:inline">P2P</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="mt-4">
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm">
                <p className="font-medium text-green-700 dark:text-green-400">💡 Zero Storage Used</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Stream directly from YouTube, Vimeo, or any video URL
                </p>
              </div>
              <UrlMediaInput onUrlReady={handleUrlReady} />
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm">
                <p className="font-medium text-blue-700 dark:text-blue-400">📤 Upload to Cloud</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Files under 50MB • Auto-deleted after session
                </p>
              </div>
              <TusUploader onUploadComplete={handleUploadComplete} />
            </div>
          </TabsContent>

          <TabsContent value="p2p" className="mt-4">
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-sm">
                <p className="font-medium text-purple-700 dark:text-purple-400">🔗 Direct Streaming</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Stream any file size directly from your device via WebRTC
                </p>
              </div>
              <P2PStreamHost onStartStream={handleP2PStart} roomId={roomId} />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
