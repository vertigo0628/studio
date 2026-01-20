"use client";

import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Link2, Play, Loader2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type UrlMediaInputProps = {
    onUrlReady: (url: string, type: 'audio' | 'video', title: string) => void;
    disabled?: boolean;
};

// URL patterns for different platforms
const URL_PATTERNS = {
    youtube: /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
    vimeo: /(?:vimeo\.com\/)(\d+)/,
    directVideo: /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i,
    directAudio: /\.(mp3|wav|ogg|m4a|flac|aac)(\?.*)?$/i,
};

type UrlStatus = 'idle' | 'validating' | 'valid' | 'invalid';

export function UrlMediaInput({ onUrlReady, disabled }: UrlMediaInputProps) {
    const [url, setUrl] = useState("");
    const [status, setStatus] = useState<UrlStatus>('idle');
    const [mediaType, setMediaType] = useState<'audio' | 'video' | null>(null);
    const [title, setTitle] = useState("");
    const [error, setError] = useState("");

    const validateUrl = (inputUrl: string) => {
        if (!inputUrl.trim()) {
            setStatus('idle');
            setMediaType(null);
            setError("");
            return;
        }

        setStatus('validating');
        setError("");

        // Check for YouTube
        if (URL_PATTERNS.youtube.test(inputUrl)) {
            const match = inputUrl.match(URL_PATTERNS.youtube);
            setStatus('valid');
            setMediaType('video');
            setTitle(`YouTube Video (${match?.[1] || 'Unknown'})`);
            return;
        }

        // Check for Vimeo
        if (URL_PATTERNS.vimeo.test(inputUrl)) {
            const match = inputUrl.match(URL_PATTERNS.vimeo);
            setStatus('valid');
            setMediaType('video');
            setTitle(`Vimeo Video (${match?.[1] || 'Unknown'})`);
            return;
        }

        // Check for direct video URL
        if (URL_PATTERNS.directVideo.test(inputUrl)) {
            setStatus('valid');
            setMediaType('video');
            // Extract filename from URL
            const filename = inputUrl.split('/').pop()?.split('?')[0] || 'Video';
            setTitle(decodeURIComponent(filename));
            return;
        }

        // Check for direct audio URL
        if (URL_PATTERNS.directAudio.test(inputUrl)) {
            setStatus('valid');
            setMediaType('audio');
            const filename = inputUrl.split('/').pop()?.split('?')[0] || 'Audio';
            setTitle(decodeURIComponent(filename));
            return;
        }

        // Try to validate as a generic URL
        try {
            new URL(inputUrl);
            // Assume video for unknown URLs
            setStatus('valid');
            setMediaType('video');
            setTitle('External Media');
        } catch {
            setStatus('invalid');
            setError("Please enter a valid URL");
        }
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newUrl = e.target.value;
        setUrl(newUrl);
        validateUrl(newUrl);
    };

    const handleSubmit = () => {
        if (status === 'valid' && mediaType) {
            onUrlReady(url, mediaType, title);
        }
    };

    const getEmbedUrl = (inputUrl: string): string => {
        // Convert YouTube URL to embed format
        const youtubeMatch = inputUrl.match(URL_PATTERNS.youtube);
        if (youtubeMatch) {
            return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1`;
        }

        // Convert Vimeo URL to embed format
        const vimeoMatch = inputUrl.match(URL_PATTERNS.vimeo);
        if (vimeoMatch) {
            return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
        }

        // Return original URL for direct links
        return inputUrl;
    };

    return (
        <div className="space-y-4">
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Link2 className="w-4 h-4" />
                </div>
                <Input
                    value={url}
                    onChange={handleUrlChange}
                    placeholder="Paste video URL (YouTube, Vimeo, or direct link)"
                    className="pl-10 pr-10"
                    disabled={disabled}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {status === 'validating' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    {status === 'valid' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {status === 'invalid' && <XCircle className="w-4 h-4 text-destructive" />}
                </div>
            </div>

            {error && (
                <p className="text-sm text-destructive">{error}</p>
            )}

            {status === 'valid' && mediaType && (
                <div className="p-3 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-sm">{title}</p>
                            <p className="text-xs text-muted-foreground capitalize">{mediaType} • Ready to stream</p>
                        </div>
                        <Button
                            size="sm"
                            onClick={handleSubmit}
                            disabled={disabled}
                            className="gap-2"
                        >
                            <Play className="w-4 h-4" />
                            Start Watching
                        </Button>
                    </div>
                </div>
            )}

            <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Supported sources:</p>
                <ul className="list-disc list-inside space-y-0.5">
                    <li>YouTube videos</li>
                    <li>Vimeo videos</li>
                    <li>Direct video links (.mp4, .webm, .mov)</li>
                    <li>Direct audio links (.mp3, .wav, .m4a)</li>
                </ul>
            </div>
        </div>
    );
}

// Helper to check if URL is an embed (YouTube/Vimeo) vs direct
export function isEmbedUrl(url: string): boolean {
    return URL_PATTERNS.youtube.test(url) || URL_PATTERNS.vimeo.test(url);
}

// Helper to get embed URL
export function getEmbedUrl(url: string): string {
    const youtubeMatch = url.match(URL_PATTERNS.youtube);
    if (youtubeMatch) {
        return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1`;
    }

    const vimeoMatch = url.match(URL_PATTERNS.vimeo);
    if (vimeoMatch) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
    }

    return url;
}
