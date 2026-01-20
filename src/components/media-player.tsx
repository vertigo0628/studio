"use client";

import Image from 'next/image';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Pause, Play, X, Music, Clapperboard, Maximize2, PictureInPicture2, Link2, Radio } from 'lucide-react';
import type { Media } from '@/lib/types';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

type MediaPlayerProps = {
    media: Media;
    onStop: () => void;
};

export default function MediaPlayer({ media, onStop }: MediaPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isPiP, setIsPiP] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        // Don't control playback for embeds
        if (media.isEmbed) return;

        if (isPlaying) {
            audioRef.current?.play();
            videoRef.current?.play();
        } else {
            audioRef.current?.pause();
            videoRef.current?.pause();
        }
    }, [isPlaying, media.isEmbed]);

    const handleFullscreen = () => {
        if (media.isEmbed) {
            // For embeds, expand to fullscreen overlay
            setIsExpanded(!isExpanded);
            return;
        }

        const videoElement = videoRef.current;
        if (videoElement) {
            if (!document.fullscreenElement) {
                videoElement.requestFullscreen();
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

    // Get source type icon
    const getSourceIcon = () => {
        switch (media.sourceType) {
            case 'url':
                return <Link2 className="w-3 h-3" />;
            case 'p2p':
                return <Radio className="w-3 h-3" />;
            default:
                return null;
        }
    };

    // Expanded view for embeds (YouTube/Vimeo)
    if (isExpanded && media.isEmbed) {
        return (
            <div className="fixed inset-0 z-50 bg-black flex flex-col">
                <div className="absolute top-4 right-4 z-10">
                    <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => setIsExpanded(false)}
                        title="Exit Fullscreen"
                    >
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
            <div className="fixed inset-0 z-50 bg-black flex flex-col">
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <Button
                        variant="secondary"
                        size="icon"
                        onClick={handlePiP}
                        title="Picture in Picture"
                    >
                        <PictureInPicture2 className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => setIsExpanded(false)}
                        title="Exit Fullscreen"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
                <div className="flex-1 flex items-center justify-center p-4">
                    <video
                        ref={videoRef}
                        src={media.url}
                        className="max-w-full max-h-full rounded-lg"
                        autoPlay
                        controls
                    />
                </div>
                <div className="p-4 bg-black/80 text-white text-center">
                    <h3 className="font-bold">{media.title}</h3>
                    <p className="text-sm text-gray-400">{media.artist}</p>
                </div>
            </div>
        );
    }

    // Compact player bar
    return (
        <div className="p-2 border-b shrink-0">
            <Card className="p-3 flex items-center justify-between bg-gradient-to-r from-primary/10 to-purple-500/10 dark:from-primary/20 dark:to-purple-500/20 border-primary/30">
                <div className="flex items-center gap-3 overflow-hidden">
                    {/* Thumbnail / Preview */}
                    {media.isEmbed ? (
                        // Embed placeholder
                        <div className="relative w-14 h-14 rounded-md bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shrink-0">
                            <Clapperboard className="w-6 h-6 text-white" />
                        </div>
                    ) : media.type === 'audio' ? (
                        <>
                            <div className="relative">
                                <Image
                                    src={media.thumbnail}
                                    alt={media.title}
                                    width={56}
                                    height={56}
                                    className={cn("rounded-md object-cover w-14 h-14 shrink-0", isPlaying && "animate-pulse")}
                                    data-ai-hint="album art"
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
                            </div>
                            <audio ref={audioRef} src={media.url} autoPlay loop onEnded={() => setIsPlaying(false)} />
                        </>
                    ) : (
                        <div className="relative group">
                            <video
                                ref={videoRef}
                                src={media.url}
                                className="rounded-md object-cover w-14 h-14 shrink-0"
                                autoPlay
                                loop
                                muted={false}
                            />
                            <div className="absolute inset-0 bg-black/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Maximize2 className="w-5 h-5 text-white" />
                            </div>
                        </div>
                    )}

                    {/* Info */}
                    <div className="overflow-hidden">
                        <div className="flex items-center gap-2 text-sm text-primary font-semibold">
                            {media.type === 'audio' ? <Music className="w-4 h-4" /> : <Clapperboard className="w-4 h-4" />}
                            <span className="animate-pulse">Now Playing</span>
                            {getSourceIcon() && (
                                <span className="flex items-center gap-1 text-xs bg-primary/20 px-1.5 py-0.5 rounded">
                                    {getSourceIcon()}
                                    <span className="capitalize">{media.sourceType}</span>
                                </span>
                            )}
                        </div>
                        <p className="font-bold text-foreground truncate">{media.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{media.artist}</p>
                        {media.tempFile && (
                            <p className="text-xs text-orange-500">Auto-deletes after session</p>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1 shrink-0">
                    {!media.isEmbed && (
                        <Button variant="ghost" size="icon" onClick={() => setIsPlaying(!isPlaying)} title={isPlaying ? 'Pause' : 'Play'}>
                            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </Button>
                    )}
                    {media.type === 'video' && (
                        <>
                            {!media.isEmbed && (
                                <Button variant="ghost" size="icon" onClick={handlePiP} title="Picture in Picture">
                                    <PictureInPicture2 className="w-5 h-5" />
                                </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(true)} title="Expand">
                                <Maximize2 className="w-5 h-5" />
                            </Button>
                        </>
                    )}
                    <Button variant="ghost" size="icon" onClick={onStop} title="Stop Sharing">
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            </Card>
        </div>
    );
}
