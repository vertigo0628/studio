export type User = {
  id: string;
  name: string;
  avatar: string;
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
};
