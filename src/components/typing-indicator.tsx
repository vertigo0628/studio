"use client";

import { cn } from "@/lib/utils";

type TypingIndicatorProps = {
    users: string[];
    className?: string;
};

export function TypingIndicator({ users, className }: TypingIndicatorProps) {
    if (users.length === 0) return null;

    const displayText = users.length === 1
        ? "Someone is typing"
        : users.length === 2
            ? "2 people are typing"
            : `${users.length} people are typing`;

    return (
        <div className={cn("flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground", className)}>
            <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="italic">{displayText}...</span>
        </div>
    );
}
