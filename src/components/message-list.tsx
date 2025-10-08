"use client";

import React, { useRef, useEffect } from 'react';
import Message from '@/components/message';
import type { User, Message as MessageType } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';

type MessageListProps = {
  messages: MessageType[];
  currentUser: User;
};

export default function MessageList({ messages, currentUser }: MessageListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-4">
        {messages.map((msg) => (
          <Message key={msg.id} message={msg} isCurrentUser={msg.user.id === currentUser.id} />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
