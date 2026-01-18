"use client";

import Image from 'next/image';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Pause, Play, X, Music, Clapperboard } from 'lucide-react';
import type { Media } from '@/lib/types';
import { useState, useRef, useEffect } from 'react';

type MediaPlayerProps = {
    media: Media;
    onStop: () => void;
};

export default function MediaPlayer({ media, onStop }: MediaPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(true);
    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (isPlaying) {
            audioRef.current?.play();
            videoRef.current?.play();
        } else {
            audioRef.current?.pause();
            videoRef.current?.pause();
        }
    }, [isPlaying]);

    return (
        <div className="p-2 border-b shrink-0">
            <Card className="p-3 flex items-center justify-between bg-primary/10 dark:bg-primary/20">
                <div className="flex items-center gap-3 overflow-hidden">
                    {media.type === 'audio' ? (
                        <>
                            <Image
                                src={media.thumbnail}
                                alt={media.title}
                                width={56}
                                height={56}
                                className="rounded-md object-cover w-14 h-14 shrink-0"
                                data-ai-hint="album art"
                            />
                            <audio ref={audioRef} src={media.url} autoPlay loop onEnded={() => setIsPlaying(false)} />
                        </>
                    ) : (
                        <video
                            ref={videoRef}
                            src={media.url}
                            className="rounded-md object-cover w-14 h-14 shrink-0"
                            autoPlay
                            loop
                            muted={false}
                        />
                    )}
                    <div className="overflow-hidden">
                        <div className="flex items-center gap-2 text-sm text-primary font-semibold">
                            {media.type === 'audio' ? <Music className="w-4 h-4" /> : <Clapperboard className="w-4 h-4" />}
                            <span>Now Playing</span>
                        </div>
                        <p className="font-bold text-foreground truncate">{media.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{media.artist}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setIsPlaying(!isPlaying)}>
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        <span className="sr-only">{isPlaying ? 'Pause' : 'Play'}</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onStop}>
                        <X className="w-5 h-5" />
                        <span className="sr-only">Stop Sharing</span>
                    </Button>
                </div>
            </Card>
        </div>
    );
}
