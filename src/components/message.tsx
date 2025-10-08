import type { Message as MessageType } from '@/lib/types';
import UserAvatar from '@/components/user-avatar';
import { cn } from '@/lib/utils';

type MessageProps = {
  message: MessageType;
  isCurrentUser: boolean;
};

export default function Message({ message, isCurrentUser }: MessageProps) {
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

  return (
    <div className={cn('flex items-end gap-2', alignment)}>
      {!isCurrentUser && <UserAvatar user={message.user} className="w-8 h-8 self-end"/>}
      <div className={cn('flex flex-col max-w-xs md:max-w-md', { 'items-end': isCurrentUser })}>
        <div className={cn('px-4 py-2 shadow-sm', bubbleColor, bubbleRadius)}>
          <p className="text-sm break-words">{message.text}</p>
        </div>
        <span className="text-xs text-muted-foreground mt-1 px-2">
          {message.timestamp}
        </span>
      </div>
      {isCurrentUser && <UserAvatar user={message.user} className="w-8 h-8 self-end"/>}
    </div>
  );
}
