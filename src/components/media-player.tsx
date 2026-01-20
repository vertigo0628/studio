"use client";

import Image from 'next/image';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Pause, Play, X, Music, Clapperboard, Maximize2, PictureInPicture2, Link2, Radio, Volume2, VolumeX, Crown, Users, Loader2 } from 'lucide-react';
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
    const [isPlaying, setIsPlaying] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isPiP, setIsPiP] = useState(false);
    const [isMuted, setIsMuted] = useState(true); // Start muted to allow autoplay
    const [videoError, setVideoError] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showUnmutePrompt, setShowUnmutePrompt] = useState(true);
    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

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

    // Initialize sync when component mounts
    useEffect(() => {
        initializeSync();
        return () => {
            cleanupSync();
        };
    }, [initializeSync, cleanupSync]);

    // Update local play state from sync
    useEffect(() => {
        if (syncState) {
            setIsPlaying(syncState.isPlaying);
        }
    }, [syncState?.isPlaying]);

    // Handle play state changes
    useEffect(() => {
        if (media.isEmbed) return;

        const mediaElement = videoRef.current || audioRef.current;
        if (!mediaElement) return;

        if (isPlaying) {
            mediaElement.play().catch(e => {
                console.log('Autoplay blocked:', e);
            });
        } else {
            mediaElement.pause();
        }
    }, [isPlaying, media.isEmbed]);

    useEffect(() => {
        setVideoError(false);
    }, [media.url]);

    // Unmute handler - called on user interaction
    const handleUnmute = useCallback(() => {
        const mediaElement = videoRef.current || audioRef.current;
        if (mediaElement) {
            mediaElement.muted = false;
            setIsMuted(false);
            setShowUnmutePrompt(false);
            // Also try to play in case it was paused
            mediaElement.play().catch(console.error);
        }
    }, []);

    // Handle any click on the player to unmute
    const handlePlayerClick = useCallback(() => {
        if (isMuted) {
            handleUnmute();
        }
    }, [isMuted, handleUnmute]);

    // Time update handler
    const handleTimeUpdate = () => {
        const mediaElement = videoRef.current || audioRef.current;
        if (mediaElement) {
            setCurrentTime(mediaElement.currentTime);
        }
    };

    // Duration loaded handler
    const handleLoadedMetadata = () => {
        const mediaElement = videoRef.current || audioRef.current;
        if (mediaElement) {
            setDuration(mediaElement.duration);
        }
    };

    const handlePlayPause = async () => {
        if (!isHost) return;

        // Always unmute on play/pause interaction
        if (isMuted) {
            handleUnmute();
        }

        if (isPlaying) {
            await broadcastPause();
        } else {
            await broadcastPlay();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isHost) return;

        const newTime = parseFloat(e.target.value);
        const mediaElement = videoRef.current || audioRef.current;

        if (mediaElement) {
            mediaElement.currentTime = newTime;
            setCurrentTime(newTime);
            await broadcastSeek(newTime);
        }
    };

    const handleFullscreen = () => {
        if (media.isEmbed) {
            setIsExpanded(!isExpanded);
            return;
        }

        const videoElement = videoRef.current;
        if (videoElement) {
            if (!document.fullscreenElement) {
                videoElement.requestFullscreen().catch(console.error);
            } else {
                document.exitFullscreen();
            }
        }
        setIsExpanded(!isExpanded);
    };

    const handlePiP = async () => {
        const videoElement = videoRef.current;
        if (videoElement) {
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                    setIsPiP(false);
                } else {
                    await videoElement.requestPictureInPicture();
                    setIsPiP(true);
                }
            } catch (error) {
                console.error('PiP error:', error);
            }
        }
    };

    const toggleMute = () => {
        const mediaElement = videoRef.current || audioRef.current;
        if (mediaElement) {
            mediaElement.muted = !mediaElement.muted;
            setIsMuted(!isMuted);
            setShowUnmutePrompt(false);
        }
    };

    const getSourceIcon = () => {
        switch (media.sourceType) {
            case 'url': return <Link2 className="w-3 h-3" />;
            case 'p2p': return <Radio className="w-3 h-3" />;
            default: return null;
        }
    };

    const formatTime = (seconds: number) => {
        if (!isFinite(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Expanded view for embeds
    if (isExpanded && media.isEmbed) {
        return (
            <div className="fixed inset-0 z-50 bg-black flex flex-col">
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    {isSyncing && (
                        <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-sm flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Syncing...
                        </div>
                    )}
                    <Button variant="secondary" size="icon" onClick={() => setIsExpanded(false)}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>
                <div className="flex-1 flex items-center justify-center p-4">
                    <iframe
                        src={media.url}
                        className="w-full h-full max-w-6xl rounded-lg"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
                <div className="p-4 bg-black/80 text-white text-center">
                    <h3 className="font-bold">{media.title}</h3>
                    <p className="text-sm text-gray-400">{media.artist}</p>
                </div>
            </div>
        );
    }

    // Expanded view for regular video
    if (isExpanded && media.type === 'video' && !media.isEmbed) {
        return (
            <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={handlePlayerClick}>
                {/* Unmute prompt */}
                {isMuted && showUnmutePrompt && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-primary text-primary-foreground px-4 py-2 rounded-full flex items-center gap-2 animate-bounce">
                        <Volume2 className="w-4 h-4" />
                        <span>Click anywhere to unmute</span>
                    </div>
                )}

                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    {isSyncing && (
                        <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-sm flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Syncing...
                        </div>
                    )}
                    <Button variant="secondary" size="icon" onClick={handlePiP}>
                        <PictureInPicture2 className="w-5 h-5" />
                    </Button>
                    <Button variant="secondary" size="icon" onClick={() => setIsExpanded(false)}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>
                <div className="flex-1 flex items-center justify-center p-4">
                    <video
                        ref={videoRef}
                        src={media.url}
                        className="max-w-full max-h-full rounded-lg"
                        autoPlay
                        muted={isMuted}
                        playsInline
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onError={() => setVideoError(true)}
                    />
                </div>
                {/* Sync controls */}
                <div className="p-4 bg-black/80 text-white">
                    <div className="max-w-4xl mx-auto space-y-2">
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
                                    "flex-1 h-2 bg-gray-600 rounded-full appearance-none cursor-pointer",
                                    !isHost && "opacity-50 cursor-not-allowed"
                                )}
                            />
                            <span className="text-sm font-mono w-12">{formatTime(duration)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handlePlayPause}
                                    disabled={!isHost}
                                    className={cn(!isHost && "opacity-50")}
                                >
                                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                                </Button>
                                <Button
                                    variant={isMuted ? "destructive" : "ghost"}
                                    size="icon"
                                    onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                                >
                                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                </Button>
                                {isMuted && (
                                    <span className="text-xs text-red-400 animate-pulse">Audio muted - click to unmute</span>
                                )}
                            </div>
                            <div className="text-center">
                                <h3 className="font-bold">{media.title}</h3>
                                <p className="text-sm text-gray-400">{media.artist}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {isHost ? (
                                    <span className="flex items-center gap-1 text-sm bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                                        <Crown className="w-4 h-4" />
                                        Host
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-sm bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                                        <Users className="w-4 h-4" />
                                        Viewer
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Compact player bar
    return (
        <div className="p-2 border-b shrink-0" onClick={handlePlayerClick}>
            <Card className="p-3 bg-gradient-to-r from-primary/10 to-purple-500/10 dark:from-primary/20 dark:to-purple-500/20 border-primary/30">
                {/* Muted indicator banner */}
                {isMuted && showUnmutePrompt && !media.isEmbed && (
                    <div
                        className="mb-2 -mt-1 -mx-1 bg-primary/20 text-primary text-sm py-1.5 px-3 rounded-t-md flex items-center justify-center gap-2 cursor-pointer hover:bg-primary/30 transition-colors"
                        onClick={(e) => { e.stopPropagation(); handleUnmute(); }}
                    >
                        <VolumeX className="w-4 h-4" />
                        <span>🔇 Sound is muted - Click here to enable audio</span>
                        <Volume2 className="w-4 h-4" />
                    </div>
                )}

                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                        {/* Thumbnail / Preview */}
                        {media.isEmbed ? (
                            <div
                                className="relative w-24 h-16 rounded-md bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setIsExpanded(true)}
                            >
                                <Clapperboard className="w-8 h-8 text-white" />
                                <div className="absolute bottom-1 right-1 text-[10px] bg-black/70 text-white px-1 rounded">
                                    Click to watch
                                </div>
                            </div>
                        ) : media.type === 'audio' ? (
                            <>
                                <div className="relative" onClick={handleUnmute}>
                                    <Image
                                        src={media.thumbnail}
                                        alt={media.title}
                                        width={64}
                                        height={64}
                                        className={cn("rounded-md object-cover w-16 h-16 shrink-0", isPlaying && "animate-pulse")}
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
                                    {isMuted && (
                                        <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5">
                                            <VolumeX className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </div>
                                <audio
                                    ref={audioRef}
                                    src={media.url}
                                    autoPlay
                                    loop
                                    muted={isMuted}
                                    playsInline
                                    onTimeUpdate={handleTimeUpdate}
                                    onLoadedMetadata={handleLoadedMetadata}
                                />
                            </>
                        ) : (
                            <div className="relative group cursor-pointer shrink-0" onClick={() => setIsExpanded(true)}>
                                {videoError ? (
                                    <div className="w-24 h-16 rounded-md bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                        <Clapperboard className="w-8 h-8 text-white" />
                                    </div>
                                ) : (
                                    <video
                                        ref={videoRef}
                                        src={media.url}
                                        className="rounded-md object-cover w-24 h-16 shrink-0"
                                        autoPlay
                                        loop
                                        muted={isMuted}
                                        playsInline
                                        onTimeUpdate={handleTimeUpdate}
                                        onLoadedMetadata={handleLoadedMetadata}
                                        onError={() => setVideoError(true)}
                                    />
                                )}
                                <div className="absolute inset-0 bg-black/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Maximize2 className="w-6 h-6 text-white" />
                                </div>
                                {isPlaying && !videoError && (
                                    <div className="absolute bottom-1 left-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                )}
                                {isMuted && (
                                    <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5">
                                        <VolumeX className="w-3 h-3 text-white" />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Info */}
                        <div className="overflow-hidden min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-sm text-primary font-semibold flex-wrap">
                                {media.type === 'audio' ? <Music className="w-4 h-4 shrink-0" /> : <Clapperboard className="w-4 h-4 shrink-0" />}
                                <span className="animate-pulse">Now Playing</span>
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
                                {isSyncing && (
                                    <span className="flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-600 px-1.5 py-0.5 rounded">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Syncing
                                    </span>
                                )}
                            </div>
                            <p className="font-bold text-foreground truncate">{media.title}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="truncate">{media.artist}</span>
                                {duration > 0 && (
                                    <span className="font-mono text-xs">
                                        {formatTime(currentTime)} / {formatTime(duration)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                        {!media.isEmbed && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
                                    disabled={!isHost}
                                    title={isHost ? (isPlaying ? 'Pause' : 'Play') : 'Only host can control'}
                                    className={cn(!isHost && "opacity-50")}
                                >
                                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                </Button>
                                <Button
                                    variant={isMuted ? "destructive" : "ghost"}
                                    size="icon"
                                    onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                                    title={isMuted ? 'Click to unmute' : 'Mute'}
                                >
                                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                </Button>
                            </>
                        )}
                        {media.type === 'video' && (
                            <>
                                {!media.isEmbed && (
                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handlePiP(); }} title="Picture in Picture">
                                        <PictureInPicture2 className="w-5 h-5" />
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }} title="Expand">
                                    <Maximize2 className="w-5 h-5" />
                                </Button>
                            </>
                        )}
                        {isHost && (
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onStop(); }} title="Stop Sharing">
                                <X className="w-5 h-5" />
                            </Button>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}
