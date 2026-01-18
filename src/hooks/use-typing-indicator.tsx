"use client";

import { useEffect, useState } from 'react';
import { getDb } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from './use-auth';

export function useTypingIndicator(roomId: string) {
    const { user } = useAuth();
    const [typingUsers, setTypingUsers] = useState<string[]>([]);

    // Listen for typing indicators
    useEffect(() => {
        const db = getDb();
        if (!db || !roomId) return;

        const typingRef = doc(db, 'rooms', roomId, 'typing', 'state');
        const unsubscribe = onSnapshot(typingRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                const now = Date.now();
                // Filter out stale typing indicators (older than 5 seconds)
                const activeTypers = Object.entries(data)
                    .filter(([userId, timestamp]) => {
                        const ts = (timestamp as any)?.toMillis?.() || timestamp;
                        return now - ts < 5000 && userId !== user?.id;
                    })
                    .map(([userId]) => userId);
                setTypingUsers(activeTypers);
            } else {
                setTypingUsers([]);
            }
        });

        return () => unsubscribe();
    }, [roomId, user?.id]);

    // Set typing indicator
    const setTyping = async (isTyping: boolean) => {
        const db = getDb();
        if (!db || !user || !roomId) return;

        const typingRef = doc(db, 'rooms', roomId, 'typing', 'state');
        try {
            if (isTyping) {
                await setDoc(typingRef, {
                    [user.id]: serverTimestamp()
                }, { merge: true });
            } else {
                await setDoc(typingRef, {
                    [user.id]: null
                }, { merge: true });
            }
        } catch (error) {
            console.error('Error setting typing indicator:', error);
        }
    };

    return { typingUsers, setTyping };
}
