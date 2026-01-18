"use client";

import { useEffect } from "react";

// Notification sounds
const SOUNDS = {
    message: "/sounds/message.mp3",
    call: "/sounds/call.mp3",
    notification: "/sounds/notification.mp3",
};

export function useNotificationSound() {
    const playSound = (type: keyof typeof SOUNDS) => {
        try {
            // Create audio element on demand
            const audio = new Audio(SOUNDS[type]);
            audio.volume = 0.5;
            audio.play().catch(() => {
                // Autoplay might be blocked - that's okay
            });
        } catch (error) {
            console.error("Error playing sound:", error);
        }
    };

    return { playSound };
}

// Component to preload sounds
export function NotificationSoundPreloader() {
    useEffect(() => {
        // Preload sounds on first user interaction
        const preloadSounds = () => {
            Object.values(SOUNDS).forEach((src) => {
                const audio = new Audio(src);
                audio.preload = "auto";
            });
            document.removeEventListener("click", preloadSounds);
        };

        document.addEventListener("click", preloadSounds, { once: true });
        return () => document.removeEventListener("click", preloadSounds);
    }, []);

    return null;
}
