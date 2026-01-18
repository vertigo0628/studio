import type { Message as MessageType } from '@/lib/types';
import UserAvatar from '@/components/user-avatar';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import { Button } from './ui/button';

type MessageProps = {
  message: MessageType;
  isCurrentUser: boolean;
  onDelete?: () => void;
};

export default function Message({ message, isCurrentUser, onDelete }: MessageProps) {
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
          <p className="text-sm break-words">{message.text}</p>
          {message.file && (
            <div className="mt-2 text-xs border rounded p-2 bg-background/10">
              <a href={message.file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline">
                <span>📎</span>
                <span>{message.file.name}</span>
              </a>
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground mt-1 px-2">
          {message.timestamp}
        </span>
      </div>
      {isCurrentUser && <UserAvatar user={message.user} className="w-8 h-8 self-end" />}
    </div>
  );
}
