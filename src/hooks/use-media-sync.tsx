"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { getDb } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import type { MediaSyncState } from '@/lib/types';

type UseMediaSyncOptions = {
    roomId: string;
    userId: string;
    isHost: boolean;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    audioRef: React.RefObject<HTMLAudioElement | null>;
};

const SYNC_THRESHOLD = 2; // Seconds difference before forcing sync
const HEARTBEAT_INTERVAL = 1000; // Send sync update every 1 second

export function useMediaSync({
    roomId,
    userId,
    isHost,
    videoRef,
    audioRef,
}: UseMediaSyncOptions) {
    const [syncState, setSyncState] = useState<MediaSyncState | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const lastSyncRef = useRef<number>(0);
    const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

    // Get the active media element
    const getMediaElement = useCallback((): HTMLVideoElement | HTMLAudioElement | null => {
        return videoRef.current || audioRef.current;
    }, [videoRef, audioRef]);

    // Update sync state in Firebase (host only)
    const updateSyncState = useCallback(async (updates: Partial<MediaSyncState>) => {
        const db = getDb();
        if (!db || !isHost) return;

        const syncRef = doc(db, 'rooms', roomId, 'sync', 'playback');
        await setDoc(syncRef, {
            hostId: userId,
            ...updates,
            updatedAt: Date.now(),
        }, { merge: true });
    }, [roomId, userId, isHost]);

    // Host: Broadcast play event
    const broadcastPlay = useCallback(async () => {
        const media = getMediaElement();
        if (!media || !isHost) return;

        await updateSyncState({
            isPlaying: true,
            currentTime: media.currentTime,
            playbackRate: media.playbackRate,
        });
    }, [getMediaElement, isHost, updateSyncState]);

    // Host: Broadcast pause event
    const broadcastPause = useCallback(async () => {
        const media = getMediaElement();
        if (!media || !isHost) return;

        await updateSyncState({
            isPlaying: false,
            currentTime: media.currentTime,
        });
    }, [getMediaElement, isHost, updateSyncState]);

    // Host: Broadcast seek event
    const broadcastSeek = useCallback(async (time: number) => {
        if (!isHost) return;

        await updateSyncState({
            currentTime: time,
            seekedAt: Date.now(),
        });
    }, [isHost, updateSyncState]);

    // Viewer: Sync to host's playback state
    const syncToHost = useCallback((state: MediaSyncState) => {
        const media = getMediaElement();
        if (!media || isHost) return;

        // No latency compensation to avoid clock skew issues (viewer getting ahead)
        // We rely on frequent heartbeats (every 1s) to keep sync
        const expectedTime = state.currentTime;

        const timeDiff = Math.abs(media.currentTime - expectedTime);

        // If significantly out of sync, seek to correct position
        if (timeDiff > SYNC_THRESHOLD || state.seekedAt && state.seekedAt > lastSyncRef.current) {
            setIsSyncing(true);
            media.currentTime = expectedTime;
            lastSyncRef.current = Date.now();

            setTimeout(() => setIsSyncing(false), 500);
        }

        // Sync play/pause state
        if (state.isPlaying && media.paused) {
            media.play().catch(console.error);
        } else if (!state.isPlaying && !media.paused) {
            media.pause();
        }

        // Sync playback rate
        if (state.playbackRate && media.playbackRate !== state.playbackRate) {
            media.playbackRate = state.playbackRate;
        }
    }, [getMediaElement, isHost]);

    // Listen for sync state changes
    useEffect(() => {
        const db = getDb();
        if (!db) return;

        const syncRef = doc(db, 'rooms', roomId, 'sync', 'playback');
        const unsubscribe = onSnapshot(syncRef, (snapshot) => {
            if (snapshot.exists()) {
                const state = snapshot.data() as MediaSyncState;
                setSyncState(state);

                // Viewers sync to host
                if (!isHost && state.hostId !== userId) {
                    syncToHost(state);
                }
            }
        });

        return () => unsubscribe();
    }, [roomId, userId, isHost, syncToHost]);

    // Host: Send periodic heartbeat
    useEffect(() => {
        if (!isHost) return;

        const sendHeartbeat = () => {
            const media = getMediaElement();
            if (media && !media.paused) {
                updateSyncState({
                    currentTime: media.currentTime,
                    isPlaying: true,
                });
            }
        };

        heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

        return () => {
            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current);
            }
        };
    }, [isHost, getMediaElement, updateSyncState]);

    // Host: Initialize sync state when starting media
    const initializeSync = useCallback(async () => {
        if (!isHost) return;

        await updateSyncState({
            hostId: userId,
            isPlaying: true,
            currentTime: 0,
            playbackRate: 1,
        });
    }, [isHost, userId, updateSyncState]);

    // Clean up sync state when stopping
    const cleanupSync = useCallback(async () => {
        const db = getDb();
        if (!db || !isHost) return;

        // Don't delete, just mark as stopped
        await updateSyncState({
            isPlaying: false,
        });
    }, [isHost, updateSyncState]);

    return {
        syncState,
        isSyncing,
        isHost,
        broadcastPlay,
        broadcastPause,
        broadcastSeek,
        initializeSync,
        cleanupSync,
    };
}
