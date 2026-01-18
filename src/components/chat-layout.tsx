"use client";

import { useEffect, useState } from 'react';
import ChatHeader from '@/components/chat-header';
import MessageList from '@/components/message-list';
import ChatInput from '@/components/chat-input';
import MediaPlayer from '@/components/media-player';
import CallScreen from '@/components/call-screen';
import type { Message, Media } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  setDoc,
  doc,
  serverTimestamp,
  deleteField
} from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { useWebRTC } from '@/hooks/use-webrtc';

type ChatLayoutProps = {
  roomId: string;
};

export default function ChatLayout({ roomId }: ChatLayoutProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMedia, setCurrentMedia] = useState<Media | null>(null);

  // WebRTC calling
  const {
    callState,
    callType,
    localStream,
    remoteStream,
    incomingCall,
    startCall,
    answerCall,
    endCall,
    declineCall,
    startScreenShare,
  } = useWebRTC(roomId, user);

  // Create a placeholder partner user for the header
  const partnerUser = {
    id: 'partner',
    name: 'Chat Room',
    avatar: PlaceHolderImages.find(img => img.id === 'user-avatar-2')?.imageUrl || '',
  };

  useEffect(() => {
    // 1. Listen for Messages
    const messagesRef = collection(db, 'rooms', roomId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          text: data.text,
          user: data.user,
          timestamp: data.createdAt ? new Date(data.createdAt.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...',
          isSystemMessage: data.isSystemMessage,
        } as Message;
      });
      setMessages(newMessages);
    });

    // 2. Listen for Room State (Media)
    const roomRef = doc(db, 'rooms', roomId);
    const unsubscribeRoom = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.currentMedia) {
          setCurrentMedia(data.currentMedia as Media);
        } else {
          setCurrentMedia(null);
        }
      }
    });

    return () => {
      unsubscribeMessages();
      unsubscribeRoom();
    };
  }, [roomId]);

  const handleSendMessage = async (text: string) => {
    if (!user) return;

    try {
      const messagesRef = collection(db, 'rooms', roomId, 'messages');
      await addDoc(messagesRef, {
        text,
        user,
        createdAt: serverTimestamp(),
      });

      // Update room's last message
      await setDoc(doc(db, 'rooms', roomId), {
        lastMessage: text,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleStartMedia = async (media: Media) => {
    if (!user) return;

    try {
      const roomRef = doc(db, 'rooms', roomId);
      await setDoc(roomRef, { currentMedia: media }, { merge: true });

      const messagesRef = collection(db, 'rooms', roomId, 'messages');
      await addDoc(messagesRef, {
        text: `Started sharing ${media.type}: "${media.title}"`,
        user,
        createdAt: serverTimestamp(),
        isSystemMessage: true,
      });
    } catch (error) {
      console.error("Error starting media:", error);
    }
  };

  const handleStopMedia = async () => {
    if (!user || !currentMedia) return;

    try {
      const roomRef = doc(db, 'rooms', roomId);
      await setDoc(roomRef, { currentMedia: deleteField() }, { merge: true });

      const messagesRef = collection(db, 'rooms', roomId, 'messages');
      await addDoc(messagesRef, {
        text: `Stopped sharing ${currentMedia.type}: "${currentMedia.title}"`,
        user,
        createdAt: serverTimestamp(),
        isSystemMessage: true,
      });
    } catch (error) {
      console.error("Error stopping media:", error);
    }
  };

  const handleStartCall = (type: 'audio' | 'video') => {
    startCall(type);
  };

  return (
    <>
      {/* Call Screen Overlay */}
      {(callState === 'calling' || callState === 'ringing' || callState === 'connected') && (
        <CallScreen
          callState={callState}
          callType={callType}
          localStream={localStream}
          remoteStream={remoteStream}
          incomingCall={incomingCall}
          onAnswer={answerCall}
          onDecline={declineCall}
          onEndCall={endCall}
        />
      )}

      <div className="flex flex-col h-full w-full bg-card rounded-lg shadow-2xl border overflow-hidden">
        <ChatHeader
          partner={partnerUser}
          onStartMedia={handleStartMedia}
          onStartCall={handleStartCall}
          onStartScreenShare={startScreenShare}
        />
        {currentMedia && <MediaPlayer media={currentMedia} onStop={handleStopMedia} />}
        <MessageList messages={messages} currentUser={user} />
        <ChatInput onSendMessage={handleSendMessage} />
      </div>
    </>
  );
}
