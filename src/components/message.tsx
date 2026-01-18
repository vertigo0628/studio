"use client";

import type { Message as MessageType } from '@/lib/types';
import UserAvatar from '@/components/user-avatar';
import { cn } from '@/lib/utils';
import { Trash2, Maximize2, Image as ImageIcon, FileText, Film, Music } from 'lucide-react';
import { Button } from './ui/button';
import { MediaViewerDialog } from './media-viewer-dialog';
import { useState } from 'react';

type MessageProps = {
  message: MessageType;
  isCurrentUser: boolean;
  onDelete?: () => void;
};

export default function Message({ message, isCurrentUser, onDelete }: MessageProps) {
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);

  if (message.isSystemMessage) {
    return (
      <div className="text-center text-xs text-muted-foreground my-2">{message.text}</div>
    );
  }

  const alignment = isCurrentUser ? 'justify-end' : 'justify-start';
  const bubbleColor = isCurrentUser
    ? 'bg-primary text-primary-foreground'
    : 'bg-muted';

  const bubbleRadius = isCurrentUser
    ? 'rounded-2xl rounded-br-md'
    : 'rounded-2xl rounded-bl-md';

  const isImage = message.file?.type?.startsWith('image/');
  const isVideo = message.file?.type?.startsWith('video/');
  const isAudio = message.file?.type?.startsWith('audio/');

  const getFileIcon = () => {
    if (isImage) return <ImageIcon className="w-4 h-4" />;
    if (isVideo) return <Film className="w-4 h-4" />;
    if (isAudio) return <Music className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <>
      <div className={cn('flex items-end gap-2', alignment)}>
        {!isCurrentUser && <UserAvatar user={message.user} className="w-8 h-8 self-end" />}
        <div className={cn('flex flex-col max-w-xs md:max-w-md', { 'items-end': isCurrentUser })}>
          <div className={cn('px-4 py-2 shadow-sm relative group', bubbleColor, bubbleRadius)}>
            {isCurrentUser && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this message?')) {
                    onDelete();
                  }
                }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}

            {/* Message text - hide the auto-generated "Sent a file:" text if we're showing rich preview */}
            {(!message.file || !message.text.startsWith('Sent a file:')) && (
              <p className="text-sm break-words">{message.text}</p>
            )}

            {/* Rich File Preview */}
            {message.file && (
              <div className="mt-2">
                {/* Image Preview */}
                {isImage && (
                  <div
                    className="relative group/media cursor-pointer"
                    onClick={() => setIsMediaViewerOpen(true)}
                  >
                    <img
                      src={message.file.url}
                      alt={message.file.name}
                      className="rounded-lg max-w-full max-h-64 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/media:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <Maximize2 className="w-8 h-8 text-white" />
                    </div>
                  </div>
                )}

                {/* Video Preview */}
                {isVideo && (
                  <div
                    className="relative group/media cursor-pointer"
                    onClick={() => setIsMediaViewerOpen(true)}
                  >
                    <video
                      src={message.file.url}
                      className="rounded-lg max-w-full max-h-64 object-cover"
                      controls={false}
                      muted
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/media:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <Maximize2 className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      Video
                    </div>
                  </div>
                )}

                {/* Audio Preview */}
                {isAudio && (
                  <div
                    className="p-3 rounded-lg bg-background/20 cursor-pointer hover:bg-background/30 transition-colors"
                    onClick={() => setIsMediaViewerOpen(true)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Music className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium truncate">{message.file.name}</p>
                        <p className="text-xs opacity-70">Click to play</p>
                      </div>
                      <Maximize2 className="w-4 h-4 opacity-50" />
                    </div>
                  </div>
                )}

                {/* Generic File */}
                {!isImage && !isVideo && !isAudio && (
                  <div
                    className="p-3 rounded-lg bg-background/20 cursor-pointer hover:bg-background/30 transition-colors"
                    onClick={() => setIsMediaViewerOpen(true)}
                  >
                    <div className="flex items-center gap-3">
                      {getFileIcon()}
                      <span className="text-sm font-medium truncate flex-1">{message.file.name}</span>
                      <Maximize2 className="w-4 h-4 opacity-50" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground mt-1 px-2">
            {message.timestamp}
          </span>
        </div>
        {isCurrentUser && <UserAvatar user={message.user} className="w-8 h-8 self-end" />}
      </div>

      {/* Media Viewer Dialog */}
      {message.file && (
        <MediaViewerDialog
          isOpen={isMediaViewerOpen}
          onOpenChange={setIsMediaViewerOpen}
          file={message.file}
        />
      )}
    </>
  );
}
