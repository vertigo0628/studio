import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from '@/lib/types';
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  user: User;
  className?: string;
};

export default function UserAvatar({ user, className }: UserAvatarProps) {
  return (
    <Avatar className={cn('w-10 h-10', className)}>
      <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person portrait" />
      <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
    </Avatar>
  );
}
