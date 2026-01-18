"use client";

import { useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Paperclip, Send } from 'lucide-react';

type ChatInputProps = {
  onSendMessage: (text: string) => void;
  onSendFile: (file: File) => void;
};

export default function ChatInput({ onSendMessage, onSendFile }: ChatInputProps) {
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText('');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSendFile(file);
    }
  };

  return (
    <div className="p-4 border-t bg-background/50 shrink-0">
      <form onSubmit={handleSubmit} className="flex items-start gap-2">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          variant="ghost"
          size="icon"
          type="button"
          className="text-muted-foreground hover:text-accent-foreground shrink-0"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip />
          <span className="sr-only">Attach file</span>
        </Button>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 resize-none bg-muted border-0 focus-visible:ring-1 focus-visible:ring-ring min-h-[40px]"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <Button type="submit" size="icon" className="bg-accent hover:bg-accent/90 shrink-0">
          <Send />
          <span className="sr-only">Send message</span>
        </Button>
      </form>
    </div>
  );
}
