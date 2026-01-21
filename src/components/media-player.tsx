"use client";

import Image from 'next/image';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Pause, Play, X, Music, Clapperboard, Maximize2, Volume2, VolumeX, Crown, Users, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import type { Media } from '@/lib/types';
import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useMediaSync } from '@/hooks/use-media-sync';

type MediaPlayerProps = {
    media: Media;
    onStop: () => void;
    roomId: string;
    userId: string;
    isHost: boolean;
};

export default function MediaPlayer({ media, onStop, roomId, userId, isHost }: MediaPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isBlobUrl, setIsBlobUrl] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Debug: Log received media
    useEffect(() => {
        const isBlob = media.url.startsWith('blob:');
        setIsBlobUrl(isBlob);
        console.log('📺 Media Player received:', {
            title: media.title,
            url: media.url.substring(0, 100) + (media.url.length > 100 ? '...' : ''),
            sourceType: media.sourceType,
            isHost,
            isBlob,
        });
        if (isBlob && !isHost) {
            console.error('❌ Viewer received blob URL - this will not work!');
        }
    }, [media.url, media.title, media.sourceType, isHost]);

    // Media sync hook
    const {
        syncState,
        isSyncing,
        broadcastPlay,
        broadcastPause,
        broadcastSeek,
        initializeSync,
        cleanupSync,
    } = useMediaSync({
        roomId,
        userId,
        isHost,
        videoRef,
        audioRef,
    });

    // Initialize sync
    useEffect(() => {
        initializeSync();
        return () => {
            // Don't await - fire and forget cleanup
            void cleanupSync();
        };
    }, [initializeSync, cleanupSync]);

    // Sync play state from host
    useEffect(() => {
        if (syncState) {
            setIsPlaying(syncState.isPlaying);
        }
    }, [syncState?.isPlaying]);

    // Get the active media element
    const getMediaElement = useCallback(() => {
        return videoRef.current || audioRef.current;
    }, []);

    // Play/pause based on state
    useEffect(() => {
        if (media.isEmbed) return;
        const el = getMediaElement();
        if (!el) return;

        if (isPlaying) {
            el.play().catch(e => console.log('Play failed:', e));
        } else {
            el.pause();
        }
    }, [isPlaying, media.isEmbed, getMediaElement]);

    // Handle user click to start playback and unmute
    const handleStartPlayback = useCallback(() => {
        const el = getMediaElement();
        if (!el) return;

        // Unmute and play
        el.muted = false;
        setIsMuted(false);
        el.play().then(() => {
            setIsPlaying(true);
            if (isHost) broadcastPlay();
        }).catch(e => {
            console.log('Play failed, trying muted first:', e);
            el.muted = true;
            el.play().then(() => {
                setIsPlaying(true);
                // Then unmute
                setTimeout(() => {
                    el.muted = false;
                    setIsMuted(false);
                }, 100);
            });
        });
    }, [getMediaElement, isHost, broadcastPlay]);

    // Toggle play/pause (host only)
    const handlePlayPause = useCallback(async () => {
        if (!isHost) return;

        const el = getMediaElement();
        if (!el) return;

        if (isPlaying) {
            el.pause();
            setIsPlaying(false);
            await broadcastPause();
        } else {
            el.muted = false;
            setIsMuted(false);
            el.play().catch(console.error);
            setIsPlaying(true);
            await broadcastPlay();
        }
    }, [isHost, isPlaying, getMediaElement, broadcastPlay, broadcastPause]);

    // Toggle mute - and ensure playback starts when unmuting
    const toggleMute = useCallback(() => {
        const el = getMediaElement();
        if (el) {
            const newMutedState = !el.muted;
            el.muted = newMutedState;
            setIsMuted(newMutedState);

            // If unmuting, also ensure the audio is playing
            if (!newMutedState) {
                el.play().then(() => {
                    setIsPlaying(true);
                    console.log('✅ Audio started playing after unmute');
                }).catch(e => {
                    console.error('❌ Failed to play after unmute:', e);
                });
            }
        }
    }, [getMediaElement]);

    // Media event handlers
    const handleLoadedData = () => {
        setIsLoading(false);
        setHasError(false);
    };

    const handleError = () => {
        setIsLoading(false);
        setHasError(true);
        console.error('Media failed to load:', media.url);
    };

    const handleTimeUpdate = () => {
        const el = getMediaElement();
        if (el) setCurrentTime(el.currentTime);
    };

    const handleLoadedMetadata = () => {
        const el = getMediaElement();
        if (el) setDuration(el.duration);
    };

    const handleSeek = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isHost) return;
        const newTime = parseFloat(e.target.value);
        const el = getMediaElement();
        if (el) {
            el.currentTime = newTime;
            setCurrentTime(newTime);
            await broadcastSeek(newTime);
        }
    };

    const formatTime = (seconds: number) => {
        if (!isFinite(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // For embeds (YouTube/Vimeo), show in expanded view
    if (media.isEmbed) {
        if (isExpanded) {
            return (
                <div className="fixed inset-0 z-50 bg-black flex flex-col">
                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                        <Button variant="secondary" size="icon" onClick={() => setIsExpanded(false)}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                    <div className="flex-1 p-4">
                        <iframe
                            src={media.url}
                            className="w-full h-full rounded-lg"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                    <div className="p-4 bg-black/80 text-white text-center">
                        <h3 className="font-bold">{media.title}</h3>
                    </div>
                </div>
            );
        }

        return (
            <div className="p-2 border-b shrink-0">
                <Card className="p-3 bg-gradient-to-r from-primary/10 to-purple-500/10">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-32 h-20 rounded-md bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center cursor-pointer hover:opacity-80 shrink-0"
                            onClick={() => setIsExpanded(true)}
                        >
                            <Clapperboard className="w-10 h-10 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-sm text-primary font-semibold">
                                <Clapperboard className="w-4 h-4" />
                                <span>Watch Together</span>
                                {isHost && <Crown className="w-4 h-4 text-yellow-500" />}
                            </div>
                            <p className="font-bold truncate">{media.title}</p>
                            <Button size="sm" variant="outline" onClick={() => setIsExpanded(true)} className="mt-2">
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Open Video
                            </Button>
                        </div>
                        {isHost && (
                            <Button variant="ghost" size="icon" onClick={onStop}>
                                <X className="w-5 h-5" />
                            </Button>
                        )}
                    </div>
                </Card>
            </div>
        );
    }

    // Expanded fullscreen view for video - REMOVED (Integrated into main render for persistence)

    // Compact player bar (now handles expanded state too)
    return (
        <div className="p-2 border-b shrink-0">
            <Card className="p-3 bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/30">
                {/* P2P blob URL error for viewers */}
                {isBlobUrl && !isHost && (
                    <div className="mb-3 bg-destructive/20 text-destructive py-2 px-3 rounded-md text-sm">
                        <div className="flex items-center gap-2 font-medium">
                            <AlertCircle className="w-4 h-4" />
                            P2P streaming not available for viewers
                        </div>
                        <p className="text-xs mt-1 text-destructive/80">
                            The host is streaming from their device. Ask them to use "Upload" instead to share with everyone.
                        </p>
                    </div>
                )}

                {/* Unmute banner */}
                {isMuted && !isLoading && !hasError && !isBlobUrl && !isExpanded && (
                    <div
                        className="mb-3 bg-primary/20 text-primary py-2 px-3 rounded-md flex items-center justify-center gap-2 cursor-pointer hover:bg-primary/30"
                        onClick={handleStartPlayback}
                    >
                        <VolumeX className="w-4 h-4" />
                        <span className="font-medium">Sound is muted - Click to enable audio</span>
                        <Volume2 className="w-4 h-4" />
                    </div>
                )}


                <div className="flex items-center gap-4">
                    {/* Video/Audio Preview */}
                    {media.type === 'audio' ? (
                        <div className="relative shrink-0" onClick={handleStartPlayback}>
                            <Image
                                src={media.thumbnail}
                                alt={media.title}
                                width={80}
                                height={80}
                                className={cn("rounded-md object-cover w-20 h-20", isPlaying && "animate-pulse")}
                            />
                            {isPlaying && (
                                <div className="absolute inset-0 bg-black/30 rounded-md flex items-center justify-center">
                                    <div className="flex gap-0.5">
                                        <span className="w-1 h-4 bg-white rounded animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-1 h-6 bg-white rounded animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-1 h-3 bg-white rounded animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            )}
                            <audio
                                ref={audioRef}
                                src={media.url}
                                autoPlay
                                muted={isMuted}
                                playsInline
                                onLoadedData={handleLoadedData}
                                onError={handleError}
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                            />
                        </div>
                    ) : (
                        <>
                            {/* Persistent Video Container */}
                            <div
                                className={cn(
                                    "transition-all duration-300 ease-in-out",
                                    isExpanded
                                        ? "fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
                                        : "relative w-32 h-20 rounded-md overflow-hidden bg-black shrink-0 cursor-pointer group"
                                )}
                                onClick={() => !isExpanded && setIsExpanded(true)}
                            >
                                {/* Close button (Expanded only) */}
                                {isExpanded && (
                                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                                        {isSyncing && (
                                            <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Syncing...
                                            </div>
                                        )}
                                        <Button variant="secondary" size="icon" onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}>
                                            <X className="w-5 h-5" />
                                        </Button>
                                    </div>
                                )}

                                {hasError ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-destructive/10">
                                        <AlertCircle className="w-6 h-6 text-destructive" />
                                        <span className="text-xs text-destructive">Load failed</span>
                                    </div>
                                ) : isLoading ? (
                                    <div className="w-full h-full flex items-center justify-center bg-muted">
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    </div>
                                ) : (
                                    <video
                                        ref={videoRef}
                                        src={media.url}
                                        className={cn(
                                            "transition-all",
                                            isExpanded ? "max-w-full max-h-full rounded-none" : "w-full h-full object-cover rounded-md"
                                        )}
                                        autoPlay
                                        muted={isMuted}
                                        playsInline
                                        onLoadedData={handleLoadedData}
                                        onError={handleError}
                                        onTimeUpdate={handleTimeUpdate}
                                        onLoadedMetadata={handleLoadedMetadata}
                                        controls={false} // Custom controls
                                    />
                                )}

                                {/* Hover Overlay (Compact) */}
                                {!isExpanded && !hasError && !isLoading && (
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Maximize2 className="w-6 h-6 text-white" />
                                    </div>
                                )}

                                {/* Playing Indicator (Compact) */}
                                {!isExpanded && isPlaying && !hasError && (
                                    <div className="absolute bottom-1 left-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                )}

                                {/* Expanded Controls Overlay */}
                                {isExpanded && (
                                    <>
                                        {/* Unmute prompt */}
                                        {isMuted && (
                                            <div
                                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-6 py-4 rounded-xl text-center cursor-pointer hover:scale-105 transition-transform"
                                                onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                                            >
                                                <Volume2 className="w-12 h-12 mx-auto mb-2 animate-pulse" />
                                                <p className="text-lg font-bold">Click to Enable Audio</p>
                                                <p className="text-sm text-gray-400">Browser requires interaction</p>
                                            </div>
                                        )}

                                        {/* Controls Bar */}
                                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-white" onClick={(e) => e.stopPropagation()}>
                                            <div className="max-w-4xl mx-auto space-y-3">
                                                {/* Progress bar */}
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-mono w-12">{formatTime(currentTime)}</span>
                                                    <input
                                                        type="range"
                                                        min={0}
                                                        max={duration || 100}
                                                        value={currentTime}
                                                        onChange={handleSeek}
                                                        disabled={!isHost}
                                                        className={cn(
                                                            "flex-1 h-2 bg-gray-600 rounded-full appearance-none cursor-pointer accent-primary",
                                                            !isHost && "opacity-50 cursor-not-allowed"
                                                        )}
                                                    />
                                                    <span className="text-sm font-mono w-12">{formatTime(duration)}</span>
                                                </div>

                                                {/* Control buttons */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
                                                            disabled={!isHost}
                                                            className={cn("hover:bg-white/20 text-white", !isHost && "opacity-50")}
                                                        >
                                                            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                                                        </Button>
                                                        <Button
                                                            variant={isMuted ? "destructive" : "ghost"}
                                                            size="icon"
                                                            onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                                                            className="hover:bg-white/20 text-white"
                                                        >
                                                            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                                                        </Button>
                                                    </div>

                                                    <div className="text-center">
                                                        <p className="font-bold text-lg">{media.title}</p>
                                                        <p className="text-sm opacity-80">{media.artist}</p>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {isHost ? (
                                                            <span className="flex items-center gap-1 text-sm bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded border border-yellow-500/30">
                                                                <Crown className="w-4 h-4" />
                                                                Host
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-sm bg-blue-500/20 text-blue-400 px-2 py-1 rounded border border-blue-500/30">
                                                                <Users className="w-4 h-4" />
                                                                Synced
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Layout Placeholder when expanded */}
                            {isExpanded && <div className="w-32 h-20 shrink-0" />}
                        </>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                            {media.type === 'audio' ? <Music className="w-4 h-4" /> : <Clapperboard className="w-4 h-4" />}
                            <span>Now Playing</span>
                            {isHost ? (
                                <span className="flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded">
                                    <Crown className="w-3 h-3" />
                                    Host
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                                    <Users className="w-3 h-3" />
                                    Synced
                                </span>
                            )}
                            {isSyncing && <Loader2 className="w-3 h-3 animate-spin text-yellow-500" />}
                        </div>
                        <p className="font-bold truncate mt-1">{media.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{media.artist}</p>
                        {duration > 0 && (
                            <p className="text-xs font-mono text-muted-foreground mt-1">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </p>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handlePlayPause}
                            disabled={!isHost}
                            title={isHost ? (isPlaying ? 'Pause' : 'Play') : 'Only host can control'}
                            className={cn(!isHost && "opacity-50")}
                        >
                            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </Button>
                        <Button
                            variant={isMuted ? "destructive" : "ghost"}
                            size="icon"
                            onClick={toggleMute}
                            title={isMuted ? 'Unmute' : 'Mute'}
                        >
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </Button>
                        {media.type === 'video' && (
                            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(true)} title="Fullscreen">
                                <Maximize2 className="w-5 h-5" />
                            </Button>
                        )}
                        {isHost && (
                            <Button variant="ghost" size="icon" onClick={onStop} title="Stop">
                                <X className="w-5 h-5" />
                            </Button>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}
