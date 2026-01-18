export type User = {
  id: string;
  name: string;
  avatar: string;
};

export type Room = {
  id: string;
  name: string;
  avatar: string;
  lastMessage?: string;
  updatedAt?: any; // Firestore timestamp
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
};

export type Call = {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'connected' | 'ended';
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
};
