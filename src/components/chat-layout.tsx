"use client";

import React, { useState } from 'react';
import ChatHeader from '@/components/chat-header';
import MessageList from '@/components/message-list';
import ChatInput from '@/components/chat-input';
import MediaPlayer from '@/components/media-player';
import type { Message, User, Media } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const currentUser: User = {
  id: 'user1',
  name: 'You',
  avatar: PlaceHolderImages.find(img => img.id === 'user-avatar-1')?.imageUrl || '',
};

const partnerUser: User = {
  id: 'user2',
  name: 'Duet Partner',
  avatar: PlaceHolderImages.find(img => img.id === 'user-avatar-2')?.imageUrl || '',
};

const initialMessages: Message[] = [
  { id: '1', text: 'Hey, how is it going?', timestamp: '10:00 AM', user: partnerUser },
  { id: '2', text: 'Pretty good! I found this cool app, DuetCast.', timestamp: '10:01 AM', user: currentUser },
  { id: '3', text: 'Oh nice! What can you do with it?', timestamp: '10:01 AM', user: partnerUser },
  { id: '4', text: 'We can chat, call, and even share music or videos in real-time. It\'s like our own private broadcast!', timestamp: '10:02 AM', user: currentUser },
];

export default function ChatLayout() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [currentMedia, setCurrentMedia] = useState<Media | null>(null);

  const handleSendMessage = (text: string) => {
    const newMessage: Message = {
      id: String(Date.now()),
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      user: currentUser,
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleStartMedia = (media: Media) => {
    setCurrentMedia(media);
    const newMessage: Message = {
      id: String(Date.now()),
      text: `Started sharing ${media.type}: "${media.title}"`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      user: currentUser,
      isSystemMessage: true,
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleStopMedia = () => {
    if (currentMedia) {
      const newMessage: Message = {
        id: String(Date.now()),
        text: `Stopped sharing ${currentMedia.type}: "${currentMedia.title}"`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        user: currentUser,
        isSystemMessage: true,
      };
      setMessages(prev => [...prev, newMessage]);
      setCurrentMedia(null);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto bg-card rounded-lg shadow-2xl border overflow-hidden">
      <ChatHeader partner={partnerUser} onStartMedia={handleStartMedia} />
      {currentMedia && <MediaPlayer media={currentMedia} onStop={handleStopMedia} />}
      <MessageList messages={messages} currentUser={currentUser} />
      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  );
}
