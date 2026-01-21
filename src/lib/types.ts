export type User = {
  id: string;
  name: string;
  avatar: string;
  email?: string | null;
  isAnonymous?: boolean;
  phone?: string | null;
  about?: string | null;
  status?: 'online' | 'busy' | 'away' | 'offline';
  socials?: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  } | null;
};

export type Room = {
  id: string;
  name: string;
  avatar: string;
  lastMessage?: string;
  updatedAt?: any;
  ownerId?: string;
  memberIds?: string[];
  type?: 'public' | 'private' | 'dm';
};


export type Message = {
  id: string;
  text: string;
  timestamp: string;
  user: User;
  file?: {
    name: string;
    url: string;
    type: string;
  };
  isSystemMessage?: boolean;
};

export type Media = {
  type: 'audio' | 'video';
  title: string;
  artist: string;
  thumbnail: string;
  url: string;
  // New fields for advanced streaming
  sourceType?: 'upload' | 'url' | 'p2p'; // How the media is being shared
  tempFile?: boolean; // If true, delete from storage when session ends
  isEmbed?: boolean; // If true, use iframe (YouTube/Vimeo)
  storagePath?: string; // Path in Supabase storage for cleanup
};

export type Call = {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  type: 'audio' | 'video' | 'screen';
  status: 'ringing' | 'connected' | 'ended';
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
};

// Media sync state for watch-together
export type MediaSyncState = {
  hostId: string; // User ID of the host (controller)
  isPlaying: boolean;
  currentTime: number; // In seconds
  playbackRate: number;
  updatedAt: number; // Timestamp for latency calculation
  seekedAt?: number; // When a seek happened (for immediate sync)
};
