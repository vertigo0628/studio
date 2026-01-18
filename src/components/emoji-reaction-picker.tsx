"use client";

import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Smile } from "lucide-react";
import { useState } from "react";

const EMOJI_LIST = [
    "👍", "❤️", "😂", "😮", "😢", "😡",
    "🔥", "👏", "🎉", "💯", "🙏", "💪",
    "😎", "🤔", "👀", "✨", "💀", "🤣"
];

type EmojiReactionPickerProps = {
    onSelect: (emoji: string) => void;
    existingReactions?: { emoji: string; count: number; userReacted: boolean }[];
};

export function EmojiReactionPicker({ onSelect, existingReactions = [] }: EmojiReactionPickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleSelect = (emoji: string) => {
        onSelect(emoji);
        setIsOpen(false);
    };

    return (
        <div className="flex items-center gap-1">
            {/* Show existing reactions */}
            {existingReactions.map((reaction) => (
                <Button
                    key={reaction.emoji}
                    variant={reaction.userReacted ? "default" : "outline"}
                    size="sm"
                    className="h-6 px-2 text-xs rounded-full"
                    onClick={() => onSelect(reaction.emoji)}
                >
                    {reaction.emoji} {reaction.count > 1 && reaction.count}
                </Button>
            ))}

            {/* Add reaction button */}
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Smile className="w-4 h-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                    <div className="grid grid-cols-6 gap-1">
                        {EMOJI_LIST.map((emoji) => (
                            <Button
                                key={emoji}
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-lg hover:bg-accent"
                                onClick={() => handleSelect(emoji)}
                            >
                                {emoji}
                            </Button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
