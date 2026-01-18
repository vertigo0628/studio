"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Paperclip, Send, Smile, X } from 'lucide-react';
import { VoiceRecorder } from './voice-recorder';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

const QUICK_EMOJIS = ["😊", "😂", "❤️", "👍", "🔥", "😎", "🎉", "😢", "😮", "🤔", "👏", "💪"];

type ChatInputProps = {
  onSendMessage: (text: string) => void;
  onSendFile: (file: File) => void;
  onTyping?: (isTyping: boolean) => void;
};

export default function ChatInput({ onSendMessage, onSendFile, onTyping }: ChatInputProps) {
  const [text, setText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle typing indicator
  const handleTextChange = (newText: string) => {
    setText(newText);

    if (onTyping) {
      onTyping(true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText('');
      if (onTyping) onTyping(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSendFile(file);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleVoiceSend = async (audioBlob: Blob) => {
    // Create a File from the Blob
    const file = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
    onSendFile(file);
  };

  const insertEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
    setShowEmojis(false);
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Send the first file
      onSendFile(files[0]);
    }
  }, [onSendFile]);

  return (
    <div
      className={`p-4 border-t bg-background/50 shrink-0 transition-colors ${isDragging ? 'bg-primary/10 border-primary' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none z-10">
          <div className="text-primary font-semibold text-lg">Drop files here to send</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileSelect}
          accept="*/*"
        />

        {/* Attachment button */}
        <Button
          variant="ghost"
          size="icon"
          type="button"
          className="text-muted-foreground hover:text-accent-foreground shrink-0"
          onClick={() => fileInputRef.current?.click()}
          title="Attach file"
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        {/* Emoji picker */}
        <Popover open={showEmojis} onOpenChange={setShowEmojis}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="text-muted-foreground hover:text-accent-foreground shrink-0"
              title="Add emoji"
            >
              <Smile className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start" side="top">
            <div className="grid grid-cols-6 gap-1">
              {QUICK_EMOJIS.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="icon"
                  type="button"
                  className="h-8 w-8 text-lg hover:bg-accent"
                  onClick={() => insertEmoji(emoji)}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Voice recorder */}
        <VoiceRecorder onSendVoice={handleVoiceSend} disabled={text.length > 0} />

        {/* Text input */}
        <Textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 resize-none bg-muted border-0 focus-visible:ring-1 focus-visible:ring-ring min-h-[40px] max-h-[120px]"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />

        {/* Send button */}
        <Button
          type="submit"
          size="icon"
          className="bg-primary hover:bg-primary/90 shrink-0"
          disabled={!text.trim()}
        >
          <Send className="w-5 h-5" />
        </Button>
      </form>
    </div>
  );
}
